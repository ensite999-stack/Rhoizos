<?php
declare(strict_types=1);

namespace Rhoizos;

/** Server-side only. Never include request bodies or credentials in exceptions. */
class Http
{
    public static function request(string $base, string $path, string $method, array $headers, ?array $body = null): array
    {
        $responseHeaders = [];
        $ch = curl_init($base . $path);
        curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 20, CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_HTTPHEADER => array_merge(['Accept: application/json', 'Content-Type: application/json'], $headers),
            CURLOPT_HEADERFUNCTION => static function ($ch, string $line) use (&$responseHeaders): int {
                if (str_contains($line, ':')) { [$k, $v] = explode(':', $line, 2); $responseHeaders[strtolower(trim($k))] = trim($v); }
                return strlen($line);
            },
        ]);
        if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_THROW_ON_ERROR));
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $failed = curl_errno($ch);
        curl_close($ch);
        if ($failed || $raw === false) throw new \RuntimeException('Provider connection interrupted. Reconcile pending operations before retrying.');
        if ($status < 200 || $status >= 300) throw new \RuntimeException('Provider rejected the request (HTTP ' . $status . ').');
        return ['status' => $status, 'headers' => $responseHeaders, 'body' => $raw === '' ? [] : json_decode($raw, true, 512, JSON_THROW_ON_ERROR)];
    }
}

class State
{
    private \PDO $db;
    public function __construct(?string $path = null)
    {
        $dir = $path ?? getenv('RHOIZOS_STATE_DIR');
        if (!$dir || !is_dir($dir) || !is_writable($dir)) throw new \RuntimeException('RHOIZOS_STATE_DIR must be a private, writable directory outside the web root.');
        $this->db = new \PDO('sqlite:' . $dir . '/rhoizos.sqlite', null, null, [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]);
        @chmod($dir . '/rhoizos.sqlite', 0600);
        $this->db->exec('PRAGMA busy_timeout=5000');
        $this->db->exec('CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    }
    public function get(string $key): ?array
    {
        $s = $this->db->prepare('SELECT value FROM state WHERE key=?'); $s->execute([$key]); $v = $s->fetchColumn();
        return $v === false ? null : json_decode($v, true, 512, JSON_THROW_ON_ERROR);
    }
    public function put(string $key, array $value): void
    {
        $s = $this->db->prepare('INSERT INTO state(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
        $s->execute([$key, json_encode($value, JSON_THROW_ON_ERROR)]);
    }
    public function claim(string $key, array $value): bool
    {
        $s = $this->db->prepare('INSERT OR IGNORE INTO state(key,value) VALUES(?,?)');
        $s->execute([$key, json_encode($value, JSON_THROW_ON_ERROR)]); return $s->rowCount() === 1;
    }
}

class Rules
{
    public static function domain(string $input): string
    {
        $input = strtolower(trim($input));
        if (function_exists('idn_to_ascii')) $input = idn_to_ascii($input, IDNA_DEFAULT, INTL_IDNA_VARIANT_UTS46) ?: '';
        if (strlen($input) > 253 || !preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/D', $input)) throw new \InvalidArgumentException('Invalid domain name.');
        return $input;
    }
    public static function contact(array $d): array
    {
        foreach (['first_name','last_name','email','country','state','city','address_1','postcode','phone_full'] as $key) {
            if (!isset($d[$key]) || !is_string($d[$key]) || trim($d[$key]) === '') throw new \InvalidArgumentException('Required contact field: ' . $key);
            $d[$key] = trim($d[$key]);
        }
        if (!filter_var($d['email'], FILTER_VALIDATE_EMAIL)) throw new \InvalidArgumentException('Invalid email address.');
        if (!preg_match('/^[A-Z]{2}$/D', $d['country'])) throw new \InvalidArgumentException('Use an ISO two-letter country code.');
        if (!preg_match('/^\+([0-9]{1,3})\.([0-9]{4,14})$/D', $d['phone_full'], $m) || strlen($d['phone_full']) > 17) throw new \InvalidArgumentException('Phone must use +countrycode.number format.');
        foreach (['first_name','last_name','state','city','address_1'] as $key) {
            if (!preg_match('/^[\x20-\x7e]+$/D', $d[$key]) || strlen($d[$key]) > 255) throw new \InvalidArgumentException('Use Latin characters in ' . $key . '.');
        }
        if (strlen($d['first_name']) > 125 || strlen($d['last_name']) > 125 || strlen($d['postcode']) > 16) throw new \InvalidArgumentException('Contact field is too long.');
        if (($d['type'] ?? '') === 'company' && empty(trim($d['company'] ?? ''))) throw new \InvalidArgumentException('Company name is required.');
        return array_merge($d, ['phone_cc' => $m[1], 'phone' => $m[2]]);
    }
    public static function record(array $d): array
    {
        $type = strtoupper((string) ($d['type'] ?? ''));
        $key = ['A'=>'address','AAAA'=>'address','CNAME'=>'cname','TXT'=>'value','MX'=>'exchange'][$type] ?? null;
        if (!$key) throw new \InvalidArgumentException('Unsupported record type.');
        $value = (string) ($d[$key] ?? $d['value'] ?? '');
        $name = (string) ($d['name'] ?? '');
        if (!preg_match('/^(?:@|\*|[a-zA-Z0-9_*.-]{1,253})$/D', $name) || $value === '' || strlen($value) > 2048) throw new \InvalidArgumentException('Invalid record host or value.');
        if ($type === 'A' && !filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) throw new \InvalidArgumentException('An IPv4 address is required.');
        if ($type === 'AAAA' && !filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) throw new \InvalidArgumentException('An IPv6 address is required.');
        if (in_array($type, ['CNAME','MX'], true)) self::domain(rtrim($value, '.'));
        $ttl = filter_var($d['ttl'] ?? 3600, FILTER_VALIDATE_INT, ['options'=>['min_range'=>60,'max_range'=>3600]]);
        if ($ttl === false) throw new \InvalidArgumentException('TTL must be between 60 and 3600 seconds.');
        $record = ['type'=>$type,'name'=>$name,'ttl'=>$ttl,$key=>$value];
        if ($type === 'MX') {
            $p = filter_var($d['preference'] ?? 10, FILTER_VALIDATE_INT, ['options'=>['min_range'=>0,'max_range'=>65535]]);
            if ($p === false) throw new \InvalidArgumentException('Invalid MX priority.');
            $record['preference'] = $p;
        }
        return $record;
    }
    public static function fingerprint(array $r): string
    {
        unset($r['label'], $r['ttl'], $r['group']);
        // DNS identifiers are case-insensitive. TXT contents are not.
        $isTxt = strtoupper((string)($r['type'] ?? '')) === 'TXT';
        foreach ($r as $key => &$value) if (is_string($value) && !($isTxt && $key === 'value')) $value = strtolower($value);
        unset($value); ksort($r);
        return hash('sha256', json_encode($r, JSON_THROW_ON_ERROR));
    }
    public static function canonical(mixed $value): mixed
    {
        if (!is_array($value)) return $value;
        if (!array_is_list($value)) ksort($value);
        foreach ($value as &$v) $v = self::canonical($v);
        return $value;
    }
    public static function verifySignature(array $body, string $signature, string $secret): bool
    {
        if ($secret === '' || !preg_match('/^[a-f0-9]{128}$/iD', $signature)) return false;
        $json = json_encode(self::canonical($body), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        return hash_equals(hash_hmac('sha512', $json, $secret), strtolower($signature));
    }
    public static function payable(array $p, array $expected): bool
    {
        if (($p['payment_status'] ?? '') !== 'finished') return false;
        if ((string) ($p['invoice_id'] ?? '') !== (string) $expected['provider_invoice_id'] || (string) ($p['order_id'] ?? '') !== (string) $expected['order_id']) throw new \RuntimeException('Payment does not match invoice.');
        if (strtolower((string) ($p['price_currency'] ?? '')) !== strtolower($expected['currency'])) throw new \RuntimeException('Payment currency mismatch.');
        if (abs((float) ($p['price_amount'] ?? 0) - (float) $expected['amount']) > 0.000001) throw new \RuntimeException('Invoice amount mismatch.');
        if ((float) ($p['pay_amount'] ?? 0) <= 0 || (float) ($p['actually_paid'] ?? 0) + 1e-12 < (float) $p['pay_amount']) throw new \RuntimeException('Payment is underpaid; manual reconciliation required.');
        return true;
    }
}
