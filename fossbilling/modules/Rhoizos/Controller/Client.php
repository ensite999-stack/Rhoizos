<?php
namespace Box\Mod\Rhoizos\Controller;
class Client implements \FOSSBilling\InjectionAwareInterface
{
    protected ?\Pimple\Container $di=null;
    public function setDi(\Pimple\Container $di): void { $this->di=$di; }
    public function getDi(): ?\Pimple\Container { return $this->di; }
    public function register(\Box_App &$app) { $app->get('/rhoizos','index',[],static::class); }
    public function index(\Box_App $app) { return $app->render('mod_rhoizos_index'); }
}
