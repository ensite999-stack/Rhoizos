<?php
namespace Box\Mod\Rhoizos;
require_once dirname(__DIR__,2).'/library/Rhoizos/Core.php';
class Service implements \FOSSBilling\InjectionAwareInterface
{
    protected ?\Pimple\Container $di=null;
    public function setDi(\Pimple\Container $di): void { $this->di=$di; }
    public function getDi(): ?\Pimple\Container { return $this->di; }
    public function install(): bool
    {
        $this->di['db']->exec('CREATE TABLE IF NOT EXISTS rhoizos_dns_label (client_id BIGINT NOT NULL, service_id BIGINT NOT NULL, fingerprint CHAR(64) NOT NULL, label VARCHAR(80) NOT NULL, PRIMARY KEY(client_id,service_id,fingerprint)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
        return true;
    }
    public function uninstall(): bool { return true; } // Preserve customer notes on module disable/removal.
    public function rateLimit(string $action,int $limit=20): void
    {
        $session=$this->di['session']; $key='rhoizos_limit_'.$action; $v=$session->get($key) ?: ['at'=>time(),'count'=>0];
        if (time()-$v['at']>60) $v=['at'=>time(),'count'=>0];
        if ($v['count']>=$limit) throw new \FOSSBilling\InformationException('Too many requests. Try again in a minute.');
        $v['count']++; $session->set($key,$v);
    }
    public function owned($client,array $data): array
    {
        $service=$this->di['mod_service']('order');
        $order=$service->findForClientById($client,(int)($data['order_id']??0));
        if (!$order instanceof \Model_ClientOrder || $order->status!=='active' || $order->service_type!=='domain') throw new \FOSSBilling\InformationException('Active domain order not found.');
        $domain=$service->getOrderService($order);
        if (!$domain instanceof \Model_ServiceDomain || (int)$domain->client_id!==(int)$client->id) throw new \FOSSBilling\InformationException('Domain not found.');
        return [$domain];
    }
    public function label($client,$domain,array $record,string $label): void
    {
        if (mb_strlen($label)>80) throw new \FOSSBilling\InformationException('Labels may contain up to 80 characters.');
        $this->di['db']->exec('INSERT INTO rhoizos_dns_label(client_id,service_id,fingerprint,label) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE label=VALUES(label)',[$client->id,$domain->id,\Rhoizos\Rules::fingerprint($record),$label]);
    }
}
