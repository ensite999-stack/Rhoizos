<?php
declare(strict_types=1);
require_once dirname(__DIR__, 2) . '/Rhoizos/Core.php';

/** FOSSBilling 0.7.2 adapter. Async requests never return true before success. */
class Registrar_Adapter_Spaceship extends Registrar_AdapterAbstract
{
    private array $config;
    public function __construct(array $config) { $this->config = $config; }
    public static function getConfig(): array
    {
        return ['label'=>'Spaceship','form'=>[
            'api_key'=>['password',['label'=>'API key']], 'api_secret'=>['password',['label'=>'API secret']],
        ]];
    }
    public function request(string $method, string $path, ?array $body = null): array
    {
        if ($this->_testMode) throw new Registrar_Exception('Spaceship live API is disabled in test mode. Use transport fixtures.');
        if (empty($this->config['api_key']) || empty($this->config['api_secret'])) throw new Registrar_Exception('Spaceship is not configured.');
        return \Rhoizos\Http::request('https://spaceship.dev/api/v1', $path, $method, ['X-API-Key: '.$this->config['api_key'], 'X-API-Secret: '.$this->config['api_secret']], $body);
    }
    private function path(Registrar_Domain $d): string { return '/domains/' . rawurlencode(\Rhoizos\Rules::domain($d->getName())); }
    public function isDomainAvailable(Registrar_Domain $domain): bool
    {
        $r = $this->request('GET', $this->path($domain).'/available')['body'];
        if (!empty($r['premiumPricing'])) throw new Registrar_Exception('Premium domains require a separate quote.');
        return ($r['result'] ?? '') === 'available';
    }
    public function isDomaincanBeTransferred(Registrar_Domain $domain): bool
    {
        $r = $this->request('GET', $this->path($domain).'/available')['body'];
        if (!empty($r['premiumPricing'])) throw new Registrar_Exception('Premium transfers require manual review.');
        // This is only a preliminary existence check. Registry locks and EPP are verified upstream on transfer.
        return ($r['result'] ?? '') === 'taken';
    }
    private function contacts(Registrar_Domain $d): array
    {
        $c = $d->getContactRegistrar();
        if (!$c) throw new Registrar_Exception('Registrant contact is missing.');
        $v = \Rhoizos\Rules::contact(['first_name'=>$c->getFirstName(),'last_name'=>$c->getLastName(),'email'=>$c->getEmail(),
            'address_1'=>$c->getAddress1(),'city'=>$c->getCity(),'state'=>$c->getState(),'country'=>$c->getCountry(),
            'postcode'=>$c->getZip(),'company'=>$c->getCompany(),'phone_full'=>'+'.ltrim((string)$c->getTelCc(),'+').'.'.$c->getTel()]);
        $body = ['firstName'=>$v['first_name'],'lastName'=>$v['last_name'],'email'=>$v['email'],'address1'=>$v['address_1'],
            'city'=>$v['city'],'country'=>$v['country'],'stateProvince'=>$v['state'],'postalCode'=>$v['postcode'],'phone'=>$v['phone_full']];
        if (!empty($v['company'])) $body['organization']=$v['company'];
        $id=$this->request('PUT','/contacts',$body)['body']['contactId'] ?? null;
        if (!$id) throw new Registrar_Exception('No contact ID returned.');
        return array_fill_keys(['registrant','admin','tech','billing'],$id);
    }
    private function provision(Registrar_Domain $d, string $kind): bool
    {
        if (getenv('RHOIZOS_LIVE_REGISTRATION') !== '1') throw new Registrar_Exception('Live registration is not enabled.');
        if (!$this->_order || !$this->_order->id) throw new Registrar_Exception('An order is required for safe provisioning.');
        $state = new \Rhoizos\State();
        $key = 'operation:'.$kind.':'.$this->_order->id.($kind === 'renew' ? ':'.$this->_order->expires_at : '');
        $op = $state->get($key);
        if (!$op) {
            if ($kind === 'register' && !$this->isDomainAvailable($d)) throw new Registrar_Exception('Domain is no longer available.');
            if ($kind === 'renew') {
                $info = $this->request('GET',$this->path($d))['body'];
                $body=['years'=>(int)$d->getRegistrationPeriod(),'currentExpirationDate'=>$info['expirationDate']];
            } else {
                $body=['autoRenew'=>false,'privacyProtection'=>['level'=>'high','userConsent'=>true],'contacts'=>$this->contacts($d)];
                if ($kind==='register') $body['years']=(int)$d->getRegistrationPeriod();
                else $body['authCode']=$d->getEpp();
            }
            // Persist before the charge-producing request. A timeout is ambiguous, never blindly retry it.
            if (!$state->claim($key,['status'=>'submitting','domain'=>$d->getName(),'created'=>time()])) throw new Registrar_Exception('Provisioning already in progress.');
            $r=$this->request('POST',$this->path($d).($kind==='register'?'':'/'.$kind),$body);
            $id=$r['headers']['spaceship-async-operationid'] ?? null;
            if (!$id) throw new Registrar_Exception('Missing operation ID. Manual reconciliation required.');
            $op=['status'=>'pending','id'=>$id,'domain'=>$d->getName()]; $state->put($key,$op);
        }
        if (($op['status'] ?? '')==='submitting') throw new Registrar_Exception('Provisioning outcome is uncertain. Reconcile with Spaceship before retrying.');
        if (($op['status'] ?? '')==='success') return $this->ready($d,$kind);
        if (($op['status'] ?? '')==='failed') throw new Registrar_Exception('Spaceship provisioning failed; operator review required.');
        $r=$this->request('GET','/async-operations/'.rawurlencode($op['id']))['body'];
        $op['status']=$r['status'] ?? 'pending'; $state->put($key,$op);
        if ($op['status']!=='success') throw new Registrar_Exception('Spaceship operation '.$op['id'].' is '.$op['status'].'. Retry activation to check its status; no new purchase is sent.');
        return $this->ready($d,$kind);
    }
    private function ready(Registrar_Domain $d,string $kind): bool
    {
        if ($kind==='transfer') {
            $info=$this->request('GET',$this->path($d))['body'];
            if (($info['lifecycleStatus']??'')!=='registered') throw new Registrar_Exception('Transfer accepted but not completed.');
        }
        return true;
    }
    public function registerDomain(Registrar_Domain $d): bool { return $this->provision($d,'register'); }
    public function transferDomain(Registrar_Domain $d): bool { return $this->provision($d,'transfer'); }
    public function renewDomain(Registrar_Domain $d): bool { return $this->provision($d,'renew'); }
    public function getDomainDetails(Registrar_Domain $d): Registrar_Domain
    {
        $v=$this->request('GET',$this->path($d))['body'];
        $d->setExpirationTime(strtotime($v['expirationDate']))->setRegistrationTime(strtotime($v['registrationDate']));
        $d->setPrivacyEnabled(($v['privacyProtection']['level'] ?? '')==='high');
        $d->setLocked(in_array('clientTransferProhibited',$v['eppStatuses'] ?? [],true));
        foreach (array_slice($v['nameservers']['hosts'] ?? [],0,4) as $i=>$ns) $d->{'setNs'.($i+1)}($ns);
        return $d;
    }
    public function modifyNs(Registrar_Domain $d): bool
    {
        $hosts=array_values(array_filter([$d->getNs1(),$d->getNs2(),$d->getNs3(),$d->getNs4()]));
        foreach ($hosts as $host) \Rhoizos\Rules::domain($host);
        $this->request('PUT',$this->path($d).'/nameservers',['provider'=>'custom','hosts'=>$hosts]); return true;
    }
    public function modifyContact(Registrar_Domain $d): bool { $this->request('PUT',$this->path($d).'/contacts',$this->contacts($d)); return true; }
    public function getEpp(Registrar_Domain $d): string { return $this->request('GET',$this->path($d).'/transfer/auth-code')['body']['authCode']; }
    public function lock(Registrar_Domain $d): bool { $this->request('PUT',$this->path($d).'/transfer/lock',['isLocked'=>true]); return true; }
    public function unlock(Registrar_Domain $d): bool { $this->request('PUT',$this->path($d).'/transfer/lock',['isLocked'=>false]); return true; }
    public function enablePrivacyProtection(Registrar_Domain $d): bool { $this->request('PUT',$this->path($d).'/privacy/preference',['privacyLevel'=>'high','userConsent'=>true]); return true; }
    public function disablePrivacyProtection(Registrar_Domain $d): bool { $this->request('PUT',$this->path($d).'/privacy/preference',['privacyLevel'=>'public','userConsent'=>true]); return true; }
    public function deleteDomain(Registrar_Domain $d): bool { throw new Registrar_Exception('Automatic deletion is not supported. Contact the operator.'); }
}
