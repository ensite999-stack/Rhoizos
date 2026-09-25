<?php
/** CLI cron worker. Only polls already-submitted operations; never starts a new purchase. */
declare(strict_types=1);
if (PHP_SAPI!=='cli' || empty($argv[1])) { fwrite(STDERR,"Usage: php scripts/reconcile.php /path/to/fossbilling\n"); exit(1); }
$root=realpath($argv[1]);
require $root.'/load.php';
$di=include $root.'/di.php';
$di['translate']();
$dir=getenv('RHOIZOS_STATE_DIR');
if (!$dir || !is_file($dir.'/rhoizos.sqlite')) exit(0);
$lock=fopen($dir.'/worker.lock','c');
if (!$lock || !flock($lock,LOCK_EX|LOCK_NB)) exit(0);
$state=new PDO('sqlite:'.$dir.'/rhoizos.sqlite');
$rows=$state->query("SELECT key,value FROM state WHERE key LIKE 'operation:%'")->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $row) {
    $v=json_decode($row['value'],true);
    if (!in_array($v['status']??'', ['pending','success'],true)) continue;
    $parts=explode(':',$row['key']); $kind=$parts[1]; $id=(int)$parts[2];
    try {
        $order=$di['db']->getExistingModelById('ClientOrder',$id);
        if ($kind!=='renew' && !in_array($order->status,['pending_setup','failed_setup'],true)) continue;
        if ($kind==='renew' && implode(':',array_slice($parts,3))!==(string)$order->expires_at) continue;
        // FOSSBilling owns activation bookkeeping; adapters resume the existing operation ID.
        if ($kind==='renew') $di['api_system']->order_renew(['id'=>$id]);
        else $di['api_system']->order_activate(['id'=>$id]);
        fwrite(STDOUT,"Reconciled order #$id\n");
    } catch (Throwable $e) {
        // Avoid personal data, API keys and request bodies in cron logs.
        fwrite(STDERR,"Order #$id still pending or requires operator review.\n");
    }
}
flock($lock,LOCK_UN); fclose($lock);
