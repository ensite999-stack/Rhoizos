<?php
declare(strict_types=1);
require __DIR__.'/../fossbilling/library/Rhoizos/Core.php';
use Rhoizos\Rules;
use Rhoizos\State;
function check(bool $ok,string $name): void { if (!$ok) throw new RuntimeException('FAIL '.$name); echo "PASS $name\n"; }
function rejects(callable $f,string $name): void { try { $f(); } catch (Throwable $e) { echo "PASS $name\n"; return; } throw new RuntimeException('FAIL '.$name); }
$contact=['first_name'=>'Jane','last_name'=>'Doe','email'=>'jane@example.com','country'=>'SG','state'=>'Singapore','city'=>'Singapore','address_1'=>'1 Example Street','postcode'=>'00000','phone_full'=>'+65.12345678'];
check(Rules::contact($contact)['phone_cc']==='65','contact phone mapping');
rejects(fn()=>Rules::contact(array_diff_key($contact,['last_name'=>1])),'missing surname rejected');
rejects(fn()=>Rules::contact(array_merge($contact,['phone_full'=>'12345'])),'missing phone country code rejected');
rejects(fn()=>Rules::contact($contact+['type'=>'company','company'=>'']),'company name required');
rejects(fn()=>Rules::domain('https://example.com/foo'),'URL rejected');
check(Rules::domain('EXAMPLE.COM')==='example.com','domain canonicalization');
rejects(fn()=>Rules::record(['type'=>'A','name'=>'@','value'=>'::1']),'IPv6 rejected for A record');
rejects(fn()=>Rules::record(['type'=>'TXT','name'=>'@','value'=>'test','ttl'=>90000]),'DNS TTL upper bound');
$a=Rules::record(['type'=>'A','name'=>'@','value'=>'192.0.2.1','ttl'=>3600,'label'=>'private']);
check(!isset($a['label']),'private labels cannot enter upstream record payload');
check(Rules::fingerprint($a)===Rules::fingerprint(array_merge($a,['ttl'=>60,'label'=>'Changed','group'=>['type'=>'custom']])),'record identity ignores TTL and local metadata');
check(Rules::fingerprint(['type'=>'TXT','name'=>'@','value'=>'ABC'])!==Rules::fingerprint(['type'=>'TXT','name'=>'@','value'=>'abc']),'TXT values remain case sensitive');
$event=['payment_id'=>123,'nested'=>['z'=>2,'a'=>1],'payment_status'=>'finished'];
$sig=hash_hmac('sha512','{"nested":{"a":1,"z":2},"payment_id":123,"payment_status":"finished"}','test-secret');
check(Rules::verifySignature($event,$sig,'test-secret'),'recursive NOWPayments signature');
check(!Rules::verifySignature(array_merge($event,['payment_id'=>456]),$sig,'test-secret'),'tampered callback rejected');
check(!Rules::verifySignature($event,$sig,''),'empty IPN secret rejected');
$expected=['provider_invoice_id'=>'123','order_id'=>'45','currency'=>'USD','amount'=>'19.99'];
$p=['payment_status'=>'finished','invoice_id'=>123,'order_id'=>'45','price_currency'=>'usd','price_amount'=>19.99,'pay_amount'=>0.1,'actually_paid'=>0.1];
check(Rules::payable($p,$expected),'finished full payment accepted');
check(!Rules::payable(array_merge($p,['payment_status'=>'confirming']),$expected),'confirming never provisions');
rejects(fn()=>Rules::payable(array_merge($p,['actually_paid'=>0.09]),$expected),'underpayment rejected');
rejects(fn()=>Rules::payable(array_merge($p,['invoice_id'=>456]),$expected),'cross-invoice payment rejected');
rejects(fn()=>Rules::payable(array_merge($p,['price_amount'=>1]),$expected),'wrong amount rejected');
$dir=sys_get_temp_dir().'/rhoizos-test-'.bin2hex(random_bytes(5));mkdir($dir,0700);
$state=new State($dir);$state2=new State($dir);
check($state->claim('order:1',['status'=>'submitting']),'first operation claims fence');
check(!$state2->claim('order:1',['status'=>'submitting']),'duplicate operation cannot claim fence');
$state->put('order:1',['status'=>'pending','id'=>'operation-id']);
check($state2->get('order:1')['id']==='operation-id','operation survives new connection');
unlink($dir.'/rhoizos.sqlite');rmdir($dir);
