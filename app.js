(function(){
var SITES=window.SITES||[],META=window.SITES_META||{};
var COL={green:'#2e9d3f',yellow:'#f2b705',red:'#d93a2f',pending:'#9e9e9e'};
var TL={green:'绿色',yellow:'黄色',red:'红色',pending:'待定'};
var HS={google:'营业时间来自 Google 资料。',missing:'Google 无营业时间数据,按默认假设估算,仅供参考。',default_24h:'按 24 小时营业默认处理(如自助场所),请实地确认。'};
function $(i){return document.getElementById(i)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function score(s){return s.total!=null?s.total:s.T}

var map=L.map('map',{preferCanvas:false,tap:false}).setView([43.86,-79.29],11);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap 贡献者'}).addTo(map);
var canvas=L.svg({padding:.5});
var lastMarkerClick=0;
var layer=L.layerGroup().addTo(map);

var state={tiers:{green:1,yellow:1,red:1,pending:1},groups:{},min:0};
var groupLabels={};SITES.forEach(function(s){groupLabels[s.primary_group]=s.primary_group_label});

var markers=SITES.map(function(s){
  var m=L.circleMarker([s.lat,s.lng],{renderer:canvas,radius:s.tier==='pending'?4:6,weight:L.Browser.touch?6:1,color:'#fff',opacity:L.Browser.touch?0.01:1,fillColor:COL[s.tier]||COL.pending,fillOpacity:s.tier==='pending'?.6:.9});
  m.on('click',function(e){lastMarkerClick=Date.now();show(s)});
  s._m=m;return m;
});

function apply(){
  layer.clearLayers();var n=0,c={green:0,yellow:0,red:0,pending:0},anyG=Object.keys(state.groups).length>0;
  SITES.forEach(function(s){
    if(!state.tiers[s.tier])return;
    if(anyG&&!state.groups[s.primary_group])return;
    if(score(s)<state.min)return;
    layer.addLayer(s._m);n++;c[s.tier]=(c[s.tier]||0)+1;
  });
  var t='显示 '+n+' / '+SITES.length+' 个点位(绿 '+c.green+' · 黄 '+c.yellow+' · 红 '+c.red+' · 待定 '+c.pending+')';
  $('count').textContent=t;$('count-mini').textContent=n+' 个';
}

// tier checkboxes
['green','yellow','red','pending'].forEach(function(k){
  var l=document.createElement('label');l.className='t';
  l.innerHTML='<input type="checkbox" checked> <span class="dot" style="background:'+COL[k]+'"></span>'+TL[k];
  l.firstChild.onchange=function(e){state.tiers[k]=e.target.checked?1:0;apply()};
  $('tiers').appendChild(l);
});
// group select
var gs=$('group');
Object.keys(groupLabels).sort(function(a,b){return groupLabels[a]<groupLabels[b]?-1:1}).forEach(function(k){
  var o=document.createElement('option');o.value=k;o.textContent=groupLabels[k];gs.appendChild(o);
});
gs.onchange=function(){state.groups={};Array.prototype.forEach.call(gs.selectedOptions,function(o){state.groups[o.value]=1});apply()};
$('min').oninput=function(e){state.min=+e.target.value;$('minv').textContent=state.min;apply()};
$('reset').onclick=function(){
  state={tiers:{green:1,yellow:1,red:1,pending:1},groups:{},min:0};
  Array.prototype.forEach.call(gs.options,function(o){o.selected=false});
  Array.prototype.forEach.call(document.querySelectorAll('#tiers input'),function(i){i.checked=true});
  $('min').value=0;$('minv').textContent=0;apply();
};
$('toggle').onclick=function(){var p=$('panel');p.classList.toggle('collapsed');$('toggle').setAttribute('aria-expanded',!p.classList.contains('collapsed'))};
if(window.matchMedia('(max-width:700px)').matches)$('panel').classList.add('collapsed'),$('toggle').setAttribute('aria-expanded','false');

$('meta').textContent='数据版本 '+(META.config_version||'')+' · 生成 '+(META.generated_utc||'')+(META.food_complete===false?' · 餐饮数据未全部取得,待定点位暂不评级':'')+' · 阈值:绿≥'+((META.thresholds||{}).green)+',黄≥'+((META.thresholds||{}).yellow);

function gmLink(s){
  var u='https://www.google.com/maps/search/?api=1&query='+s.lat+','+s.lng;
  if(s.id)u+='&query_place_id='+encodeURIComponent(s.id);
  return u;
}
function row(a,b){return '<tr><td>'+a+'</td><td>'+b+'</td></tr>'}
function f(v,d){return v==null?'—':Number(v).toFixed(d==null?1:d)}
function show(s){
  var h='<h2>'+esc(s.name)+'</h2><div>'+esc(s.address)+'</div>'+
   '<span class="badge" style="background:'+COL[s.tier]+'">'+esc(s.tier_label||TL[s.tier])+'</span>'+
   '<div class="score">'+(s.total_display!=null?s.total_display:'—')+' <small>综合分</small></div>'+
   '<table>'+row('类别',esc((s.group_labels||[s.primary_group_label]).join('、')))+
   row('人流分 T',f(s.T_display))+row('餐饮稀缺分 S',s.S_display!=null?f(s.S_display):'待定')+
   row('类别基础分 B',f(s.B,0))+row('评论热度系数 P',f(s.P,2)+(s.n_reviews!=null?'('+s.n_reviews+' 条)':''))+
   row('营业时长系数 H',f(s.H,2)+(s.h!=null?'(每周约 '+f(s.h,0)+' 小时)':''))+
   row('周边 400 米餐饮数',s.n_food==null?'待定':s.n_food)+
   (s.rating!=null?row('Google 评分',s.rating):'')+'</table>'+
   '<ul class="r">'+(s.reasons||[]).map(function(r){return '<li>'+esc(r)+'</li>'}).join('')+'</ul>'+
   '<div class="note">'+esc(HS[s.hours_source]||('营业时间来源:'+s.hours_source))+(s.flag_temp_closed?' 该店可能已暂停营业。':'')+'</div>'+
   (s.phone?'<div>电话:'+esc(s.phone)+'</div>':'')+
   (/^https?:\/\//.test(s.website||'')?'<div><a href="'+esc(s.website)+'" target="_blank" rel="noopener">官网</a></div>':'')+
   '<a class="gm" href="'+esc(gmLink(s))+'" target="_blank" rel="noopener">在 Google 地图中打开</a>';
  $('sheet-body').innerHTML=h;$('sheet').hidden=false;$('sheet').scrollTop=0;
}
$('close').onclick=function(){$('sheet').hidden=true};
map.on('click',function(){if(Date.now()-lastMarkerClick<400)return;$('sheet').hidden=true});
apply();
if(SITES.length)map.fitBounds(L.latLngBounds(SITES.map(function(s){return[s.lat,s.lng]})).pad(.05));
})();
