/* 一方水土 · 离线缓存
   页面（index.html）优先走网络，保证每次打开都是线上最新版；断网时用缓存。
   图片、图标等静态资源先用缓存，后台顺带更新。 */
const CACHE='yifang-v1';
const CORE=['./','index.html','manifest.webmanifest','assets/icon/icon-192.png','assets/icon/icon-512.png','assets/cover.webp'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
  const isPage=req.mode==='navigate'||/\/(index\.html)?$/.test(new URL(req.url).pathname);
  if(isPage){
    e.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res;})
      .catch(()=>caches.match(req).then(r=>r||caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit=>{
    const net=fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res;}).catch(()=>hit);
    return hit||net;
  }));
});
