<?php
namespace Box\Mod\Rhoizos\Api;
require_once dirname(__DIR__,3).'/library/Rhoizos/Core.php';
class Client extends \Api_Abstract
{
    public function checkout($data)
    {
        if (getenv('RHOIZOS_LIVE_PAYMENTS')!=='1') throw new \FOSSBilling\InformationException('Checkout is not yet enabled.');
        if (empty($data['consent'])) throw new \FOSSBilling\InformationException('Policy consent is required.');
        $c=$this->getIdentity();
        \Rhoizos\Rules::contact(['first_name'=>$c->first_name,'last_name'=>$c->last_name,'email'=>$c->email,'country'=>$c->country,'state'=>$c->state,'city'=>$c->city,'address_1'=>$c->address_1,'postcode'=>$c->postcode,'phone_full'=>'+'.ltrim($c->phone_cc,'+').'.'.$c->phone,'company'=>$c->company,'type'=>$c->type]);
        $gateway=(int)getenv('RHOIZOS_NOWPAYMENTS_GATEWAY_ID');
        if (!$gateway) throw new \FOSSBilling\InformationException('Payment gateway is not configured.');
        return $this->di['api_client']->cart_checkout(['gateway_id'=>$gateway]);
    }
    public function dns_list($data): array
    {
        $this->getService()->rateLimit('dns');
        $c=$this->getIdentity(); [$domain,$adapter]=$this->getService()->owned($c,$data);
        $records=$this->getService()->records($domain,$adapter);
        foreach ($records as &$r) $r['label']=$this->di['db']->getCell('SELECT label FROM rhoizos_dns_label WHERE client_id=? AND service_id=? AND fingerprint=?',[$c->id,$domain->id,\Rhoizos\Rules::fingerprint($r)]) ?: '';
        return ['items'=>$records];
    }
    public function dns_add($data): bool
    {
        $this->getService()->rateLimit('dns_write');
        $c=$this->getIdentity(); [$domain,$adapter]=$this->getService()->owned($c,$data);
        $r=\Rhoizos\Rules::record($data); $label=(string)($data['label']??'');
        if (mb_strlen($label)>80) throw new \FOSSBilling\InformationException('Label is too long.');
        $adapter->request('PUT','/dns/records/'.rawurlencode($domain->sld.$domain->tld),['force'=>false,'items'=>[$r]]);
        $this->getService()->label($c,$domain,$r,$label); return true;
    }
    private function current($domain,$adapter,$data): array
    {
        $r=\Rhoizos\Rules::record($data['record']??[]); $hash=\Rhoizos\Rules::fingerprint($r);
        foreach ($this->getService()->records($domain,$adapter) as $existing) if (\Rhoizos\Rules::fingerprint($existing)===$hash) return $r;
        throw new \FOSSBilling\InformationException('Record changed or no longer exists. Refresh and try again.');
    }
    public function dns_label($data): bool
    {
        $c=$this->getIdentity(); [$domain,$adapter]=$this->getService()->owned($c,$data);
        $r=$this->current($domain,$adapter,$data);
        $this->getService()->label($c,$domain,$r,(string)($data['label']??'')); return true;
    }
    public function dns_delete($data): bool
    {
        $this->getService()->rateLimit('dns_write');
        $c=$this->getIdentity(); [$domain,$adapter]=$this->getService()->owned($c,$data);
        $r=$this->current($domain,$adapter,$data); unset($r['ttl']);
        $adapter->request('DELETE','/dns/records/'.rawurlencode($domain->sld.$domain->tld),[$r]);
        $this->di['db']->exec('DELETE FROM rhoizos_dns_label WHERE client_id=? AND service_id=? AND fingerprint=?',[$c->id,$domain->id,\Rhoizos\Rules::fingerprint($r)]); return true;
    }
}
