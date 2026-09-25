<?php
namespace Box\Mod\Rhoizos\Api;
require_once dirname(__DIR__,3).'/library/Rhoizos/Core.php';
class Guest extends \Api_Abstract
{
    public function signup($data): int
    {
        $this->getService()->rateLimit('signup',5);
        if (empty($data['consent'])) throw new \FOSSBilling\InformationException('Policy consent is required.');
        $data=\Rhoizos\Rules::contact($data);
        // Explicit allowlist prevents forwarding arbitrary client-create administrative fields.
        $allowed=array_flip(['first_name','last_name','email','password','password_confirm','country','state','city','address_1','postcode','phone_cc','phone','company','type']);
        return $this->di['api_guest']->client_create(array_intersect_key($data,$allowed)+['auto_login'=>false]);
    }
    public function add_domain($data)
    {
        $this->getService()->rateLimit('cart');
        $action=$data['action']??'';
        if (!in_array($action,['register','transfer'],true)) throw new \FOSSBilling\InformationException('Invalid action.');
        $domain=\Rhoizos\Rules::domain(($data['sld']??'').($data['tld']??''));
        $productId=(int)getenv('RHOIZOS_DOMAIN_PRODUCT_ID');
        if (!$productId) throw new \FOSSBilling\InformationException('Domain product is not configured.');
        if ($action==='transfer' && empty($data['transfer_code'])) throw new \FOSSBilling\InformationException('EPP code is required.');
        return $this->di['api_guest']->cart_add_item(['id'=>$productId,'multiple'=>true,'action'=>$action,
            $action.'_sld'=>$data['sld'],$action.'_tld'=>$data['tld'],'register_years'=>1,'transfer_code'=>$data['transfer_code']??'']);
    }
    public function support(): array
    {
        $email=getenv('RHOIZOS_SUPPORT_EMAIL') ?: '';
        $path=getenv('RHOIZOS_PGP_PUBLIC_KEY_FILE');
        $pgp=$path && is_file($path) ? file_get_contents($path) : '';
        if (!str_contains($pgp,'-----BEGIN PGP PUBLIC KEY BLOCK-----') || str_contains($pgp,'PRIVATE KEY')) $pgp='';
        return ['email'=>filter_var($email,FILTER_VALIDATE_EMAIL)?$email:'','pgp'=>$pgp];
    }
    public function rdap($data): array
    {
        $this->getService()->rateLimit('rdap',10);
        $domain=\Rhoizos\Rules::domain((string)($data['domain']??''));
        // Fixed official registry origins: no arbitrary user-controlled URL or redirects (SSRF).
        $origins=['com'=>'https://rdap.verisign.com/com/v1','net'=>'https://rdap.verisign.com/net/v1','org'=>'https://rdap.publicinterestregistry.org/rdap'];
        $tld=substr(strrchr($domain,'.'),1);
        if (!isset($origins[$tld])) throw new \FOSSBilling\InformationException('RDAP is currently available for .com, .net and .org.');
        $r=\Rhoizos\Http::request($origins[$tld],'/domain/'.rawurlencode($domain),'GET',[])['body'];
        return array_intersect_key($r,array_flip(['ldhName','status','events','nameservers']));
    }
}
