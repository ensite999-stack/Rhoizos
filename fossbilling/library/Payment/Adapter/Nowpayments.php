<?php
declare(strict_types=1);
require_once dirname(__DIR__, 2) . '/Rhoizos/Core.php';

class Payment_Adapter_Nowpayments implements \FOSSBilling\InjectionAwareInterface
{
    protected ?\Pimple\Container $di = null;
    public function __construct(private array $config) {}
    public function setDi(\Pimple\Container $di): void { $this->di=$di; }
    public function getDi(): ?\Pimple\Container { return $this->di; }
    public static function getConfig(): array
    {
        return ['supports_one_time_payments'=>true,'supports_subscriptions'=>false,'description'=>'Crypto checkout with NOWPayments',
            'form'=>['api_key'=>['password',['label'=>'API key']], 'ipn_secret'=>['password',['label'=>'IPN secret']]]];
    }
    protected function request(string $method,string $path,?array $body=null): array
    {
        if (getenv('RHOIZOS_LIVE_PAYMENTS') !== '1') throw new Payment_Exception('Live payments are not enabled.');
        if (!empty($this->config['test_mode'])) throw new Payment_Exception('Use payment fixtures; live payment creation is disabled in test mode.');
        if (empty($this->config['api_key']) || empty($this->config['ipn_secret'])) throw new Payment_Exception('NOWPayments is not configured.');
        return \Rhoizos\Http::request('https://api.nowpayments.io/v1',$path,$method,['x-api-key: '.$this->config['api_key']],$body)['body'];
    }
    public function getHtml($api_admin,$invoice_id,$subscription): string
    {
        if ($subscription) throw new Payment_Exception('Subscriptions are not supported.');
        $invoice=$api_admin->invoice_get(['id'=>$invoice_id]);
        if (($invoice['status'] ?? '')!=='unpaid') throw new Payment_Exception('Invoice is not unpaid.');
        if (strtoupper($invoice['currency']) !== 'USD') throw new Payment_Exception('This adapter requires USD invoices.');
        $state=new \Rhoizos\State(); $key='checkout:'.$invoice_id; $saved=$state->get($key);
        if (!$saved) {
            if (getenv('RHOIZOS_LIVE_PAYMENTS') !== '1') throw new Payment_Exception('Live payments are not enabled.');
            $notify=$this->config['notify_url'] ?? '';
            if (!str_starts_with($notify,'https://')) throw new Payment_Exception('An HTTPS IPN callback is required.');
            $saved=['status'=>'creating','order_id'=>(string)$invoice_id,'amount'=>number_format((float)$invoice['total'],2,'.',''),'currency'=>'USD'];
            if (!$state->claim($key,$saved)) throw new Payment_Exception('Checkout creation already in progress.');
            $r=$this->request('POST','/invoice',['price_amount'=>(float)$saved['amount'],'price_currency'=>'usd',
                'order_id'=>(string)$invoice_id,'order_description'=>'Rhoizos invoice #'.$invoice_id,
                'ipn_callback_url'=>$notify,'success_url'=>$this->config['thankyou_url'],'cancel_url'=>$this->config['cancel_url'],
                'is_fee_paid_by_user'=>false]);
            $url=$r['invoice_url'] ?? '';
            if (parse_url($url,PHP_URL_SCHEME)!=='https' || parse_url($url,PHP_URL_HOST)!=='nowpayments.io') throw new Payment_Exception('Unexpected checkout URL.');
            $saved+=['provider_invoice_id'=>(string)$r['id'],'url'=>$url]; $saved['status']='ready'; $state->put($key,$saved);
        }
        if (($saved['status']??'')!=='ready') throw new Payment_Exception('Checkout outcome uncertain. Contact support before retrying.');
        if (abs((float)$saved['amount']-(float)$invoice['total'])>0.000001) throw new Payment_Exception('Invoice changed. Checkout requires reconciliation.');
        return '<a class="btn btn-primary" rel="noreferrer" href="'.htmlspecialchars($saved['url'],ENT_QUOTES).'">Pay with crypto · NOWPayments</a><p>Select the exact currency and network on the payment page. Returning here does not confirm payment.</p>';
    }
    public function processTransaction($api_admin,$id,$data,$gateway_id): void
    {
        $tx=$this->di['db']->getExistingModelById('Transaction',$id);
        $dir=getenv('RHOIZOS_STATE_DIR');
        if (!$dir || !is_dir($dir)) throw new Payment_Exception('Private state directory is not configured.');
        $lock=fopen($dir.'/settlement-'.(int)$tx->invoice_id.'.lock','c');
        if (!$lock || !flock($lock,LOCK_EX|LOCK_NB)) throw new Payment_Exception('Settlement busy; retry callback.');
        try { $this->processLocked($api_admin,$id,$data,$gateway_id); }
        finally { flock($lock,LOCK_UN); fclose($lock); }
    }
    private function processLocked($api_admin,$id,$data,$gateway_id): void
    {
        $raw=$data['http_raw_post_data'] ?? '';
        if (!is_string($raw) || strlen($raw)>65536) throw new Payment_Exception('Invalid callback payload.');
        $body=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
        $sig=$data['server']['HTTP_X_NOWPAYMENTS_SIG'] ?? '';
        if (!is_array($body) || !\Rhoizos\Rules::verifySignature($body,(string)$sig,(string)($this->config['ipn_secret']??''))) throw new Payment_Exception('Invalid callback signature.');
        $paymentId=(string)($body['payment_id']??'');
        if (!ctype_digit($paymentId)) throw new Payment_Exception('Invalid payment ID.');
        // Re-fetch trusted payment status rather than trusting even a signed stale event.
        $payment=$this->request('GET','/payment/'.rawurlencode($paymentId));
        if ((string)($payment['payment_id']??'')!==$paymentId) throw new Payment_Exception('Payment ID mismatch.');
        $invoiceId=(string)($payment['order_id']??'');
        if (!ctype_digit($invoiceId)) throw new Payment_Exception('Invalid order ID.');
        $state=new \Rhoizos\State(); $expected=$state->get('checkout:'.$invoiceId);
        if (!$expected) throw new Payment_Exception('Unknown checkout.');
        $db=$this->di['db']; $tx=$db->getExistingModelById('Transaction',$id);
        if ((int)$tx->gateway_id !== (int)$gateway_id || (int)$tx->invoice_id !== (int)$invoiceId) throw new Payment_Exception('Callback invoice or gateway mismatch.');
        $tx->txn_id=$paymentId; $tx->txn_status=$payment['payment_status'];
        if (!\Rhoizos\Rules::payable($payment,$expected)) { $tx->status='received'; $db->store($tx); return; }
        $invoice=$db->getExistingModelById('Invoice',(int)$invoiceId);
        $current=$api_admin->invoice_get(['id'=>(int)$invoiceId]);
        if (strtoupper($current['currency'])!==$expected['currency'] || abs((float)$current['total']-(float)$expected['amount'])>0.000001) throw new Payment_Exception('Current invoice does not match checkout.');
        // Invoice-level fence handles concurrent duplicate callbacks AND multiple payments for one invoice.
        $key='settlement:'.$invoiceId; $settlement=$state->get($key);
        if (!$settlement) {
            if ($invoice->status!=='unpaid') throw new Payment_Exception('Invoice already settled; reconcile incoming payment.');
            if (!$state->claim($key,['status'=>'crediting','payment_id'=>$paymentId])) throw new Payment_Exception('Settlement in progress.');
            $client=$db->getExistingModelById('Client',$invoice->client_id);
            $amount=(float)$expected['amount'];
            $this->di['mod_service']('client')->addFunds($client,$amount,'NOWPayments '.$paymentId,['amount'=>$amount,'description'=>'NOWPayments '.$paymentId,'type'=>'transaction','rel_id'=>$tx->id]);
            $settlement=['status'=>'credited','payment_id'=>$paymentId]; $state->put($key,$settlement);
        }
        if ($settlement['payment_id']!==$paymentId) throw new Payment_Exception('A different payment already settled this invoice. Manual reconciliation required.');
        if ($settlement['status']==='crediting') throw new Payment_Exception('Credit outcome uncertain. Reconcile ledger; never credit again automatically.');
        if ($settlement['status']!=='processed') {
            // Native billing ledger marks invoice paid and triggers its order provisioning hooks.
            if ($invoice->status!=='paid') $this->di['mod_service']('invoice')->payInvoiceWithCredits($invoice);
            $state->put($key,['status'=>'processed','payment_id'=>$paymentId]);
        }
        $tx->status='processed'; $tx->amount=(float)$expected['amount']; $tx->currency=$expected['currency'];
        $tx->updated_at=date('Y-m-d H:i:s'); $db->store($tx);
    }
}
