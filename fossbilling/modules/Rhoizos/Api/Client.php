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

    private function legacyDnsDisabled(): void
    {
        throw new \FOSSBilling\InformationException('Legacy DNS management is disabled. Use the Rhoizos NameSilo runtime.');
    }

    public function dns_list($data): array { $this->legacyDnsDisabled(); return []; }
    public function dns_add($data): bool { $this->legacyDnsDisabled(); return false; }
    public function dns_label($data): bool { $this->legacyDnsDisabled(); return false; }
    public function dns_delete($data): bool { $this->legacyDnsDisabled(); return false; }
}
