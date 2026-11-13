/* Woven-bunny entrance, inspired by Weaving Geodesic Foliations (2019).
   Mesh source and attribution: assets/bunny-attribution.txt. No external runtime dependencies. */
(()=>{'use strict';
 const boot=window.__bunnyIntro;if(!boot||!boot.active)return;
 const overlay=document.getElementById('bunny-intro'),canvas=document.getElementById('bunny-canvas'),skip=document.getElementById('bunny-skip');
 if(boot.reduced){overlay.hidden=false;skip.addEventListener('click',()=>boot.finish());setTimeout(()=>boot.finish(),1200);return;}
 let gl,program,buffer,frameId=0,finished=false,disposed=false,start=0,count=0,uniforms;
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frameId);window.removeEventListener('resize',resize);document.removeEventListener('keydown',key);if(gl){if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program)}}
 function finish(){if(finished)return;finished=true;boot.finish();dispose();}
 function key(e){if(e.key==='Escape')finish()}
 skip.addEventListener('click',finish);document.addEventListener('keydown',key);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();finish()},{once:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)finish()},{once:true});
 const media=matchMedia('(prefers-reduced-motion: reduce)');media.addEventListener?.('change',e=>{if(e.matches)finish()},{once:true});
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},mix=(a,b,t)=>a+(b-a)*t;
 const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),scale=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>scale(a,1/(Math.hypot(...a)||1)),lerp=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
 const rotate=(p,a)=>[p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],-p[0]*Math.sin(a)+p[2]*Math.cos(a)];
 function clip(poly,d,level,above){const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],sa=dot(a.slice(0,3),d)-level,sb=dot(b.slice(0,3),d)-level,ina=above?sa>=0:sa<=0,inb=above?sb>=0:sb<=0;if(ina)result.push(a);if(ina!==inb){const t=sa/(sa-sb);result.push(a.map((v,j)=>mix(v,b[j],t)))}}return result}
 function geometry(mesh){
  const positions=mesh.positions,normals=mesh.normals,faces=mesh.faces,result=[];
  const palette=[[.86,.12,.18],[.98,.67,.06],[.06,.25,.68],[.1,.58,.48],[.6,.14,.43],[.25,.62,.19],[.9,.9,.79]];
  [[1,.45,.16],[-.35,1,.3],[.38,.1,1]].forEach((direction,family)=>{const d=unit(direction);for(let f=0;f<faces.length;f+=3){const poly=[];for(let j=0;j<3;j++){const k=faces[f+j]*3;poly.push([...positions.slice(k,k+3),...normals.slice(k,k+3)])}const values=poly.map(a=>dot(a.slice(0,3),d)),lo=Math.min(...values),hi=Math.max(...values);for(let k=Math.floor(lo/.19)-1;k<=Math.ceil(hi/.19)+1;k++){const center=k*.19;if(center+.018<lo||center-.018>hi)continue;let p=clip(poly,d,center-.018,true);if(p.length<3)continue;p=clip(p,d,center+.018,false);if(p.length<3)continue;const color=palette[((k*3+family*2)%palette.length+palette.length)%palette.length];for(let j=1;j<p.length-1;j++){for(const a of [p[0],p[j],p[j+1]]){const n=unit(a.slice(3)),offset=.009*Math.sin((a[0]*2.3+a[1]*3.2+a[2]*1.1)*20+family*2.1);result.push(...add(a.slice(0,3),scale(n,offset)),...n,...color)}}}}});
  let nearest=0,dist=Infinity;for(let i=0;i<positions.length;i+=3){const p=positions.slice(i,i+3),ds=dot(sub(p,mesh.eye),sub(p,mesh.eye));if(ds<dist){dist=ds;nearest=i}}
  const n=unit(Array.from(normals.slice(nearest,nearest+3))),t=unit(cross(n,[0,1,0])),b=cross(n,t);mesh.eyeNormal=n;
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2,c=(i+1)/48*Math.PI*2;for(const p of [mesh.eye,add(mesh.eye,scale(add(scale(t,Math.cos(a)),scale(b,Math.sin(a))),.092)),add(mesh.eye,scale(add(scale(t,Math.cos(c)),scale(b,Math.sin(c))),.092))])result.push(...p,...n,.012,.014,.016)}
  return new Float32Array(result);
 }
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error('Shader compilation failed')}return s}
 function resize(){const dpr=Math.min(window.devicePixelRatio||1,1.6);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);gl.viewport(0,0,canvas.width,canvas.height)}
 function init(){
  const mesh=window.BUNNY_SCENE_DATA;if(!mesh)throw Error('Mesh unavailable');
  gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'});if(!gl)throw Error('WebGL unavailable');
  const vs=shader(gl.VERTEX_SHADER,`attribute vec3 p;attribute vec3 n;attribute vec3 color;uniform float angle;uniform mediump vec3 eye;uniform vec3 right;uniform vec3 up;uniform vec3 back;uniform float aspect;uniform float focal;varying mediump vec3 normal;varying mediump vec3 col;varying mediump vec3 pos;vec3 turn(vec3 v){float c=cos(angle),s=sin(angle);return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z);}void main(){vec3 world=turn(p),delta=world-eye;vec3 view=vec3(dot(delta,right),dot(delta,up),dot(delta,back));float near=.012,far=60.;gl_Position=vec4(focal/aspect*view.x,focal*view.y,-(far+near)/(far-near)*view.z-2.*far*near/(far-near),-view.z);normal=turn(n);col=color;pos=world;}`);
  const fs=shader(gl.FRAGMENT_SHADER,`precision mediump float;varying mediump vec3 normal;varying mediump vec3 col;varying mediump vec3 pos;uniform mediump vec3 eye;void main(){vec3 n=normalize(normal);if(!gl_FrontFacing)n=-n;vec3 light=normalize(vec3(-.4,1.,1.6));float diffuse=max(0.,dot(n,light));vec3 v=normalize(eye-pos);float rim=pow(1.-abs(dot(n,v)),3.);float spec=pow(max(0.,dot(reflect(-light,n),v)),24.)*.23;vec3 c=col*(.38+.72*diffuse)+vec3(.12,.16,.18)*rim+spec;gl_FragColor=vec4(c,1.);}`);
  program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Program linking failed');gl.useProgram(program);
  const data=geometry(mesh);if(!data.length||!data.every(Number.isFinite))throw Error('Invalid geometry');count=data.length/9;buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  ['p','n','color'].forEach((name,i)=>{const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,36,i*12)});
  uniforms={};['angle','eye','right','up','back','aspect','focal'].forEach(n=>uniforms[n]=gl.getUniformLocation(program,n));
  gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);resize();window.addEventListener('resize',resize);overlay.hidden=false;overlay.classList.add('bunny-ready');start=performance.now();
  try{sessionStorage.setItem('bunny-intro-v1','seen')}catch{}
  const draw=now=>{
   if(finished||!boot.active){dispose();return}const elapsed=(now-start)/1000;
   // Hold briefly, turn to the left, then fly straight toward the visible eye.
   const turn=ease((elapsed-.3)/.65),yaw=mix(-.25,.40,turn),rush=clamp((elapsed-1.02)/1.05),flight=Math.pow(rush,2.8);
   const eyePoint=rotate(mesh.eye,yaw),normal=rotate(mesh.eyeNormal,yaw),destination=add(eyePoint,scale(normal,-.025));
   const distance=innerWidth<600?11.3:7.4;
   const camera=lerp([.1,.20,distance],destination,flight),target=lerp([0,.02,0],eyePoint,ease((elapsed-.78)/.66));
   const back=unit(sub(camera,target)),right=unit(cross([0,1,0],back)),up=cross(back,right);
   gl.uniform1f(uniforms.angle,yaw);gl.uniform3fv(uniforms.eye,camera);gl.uniform3fv(uniforms.right,right);gl.uniform3fv(uniforms.up,up);gl.uniform3fv(uniforms.back,back);gl.uniform1f(uniforms.aspect,canvas.width/canvas.height);gl.uniform1f(uniforms.focal,1/Math.tan(42*Math.PI/360));gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,count);
   overlay.style.setProperty('--bunny-rush',rush.toFixed(3));
   if(elapsed>2.06){overlay.classList.add('bunny-revealing');document.documentElement.classList.remove('bunny-pending')}
   if(elapsed>=2.55){finish();return}frameId=requestAnimationFrame(draw);
  };frameId=requestAnimationFrame(draw);
 }
 try{init()}catch(error){console.warn('Bunny intro fallback:',error.message);dispose();overlay.hidden=false;overlay.classList.add('bunny-fallback');setTimeout(finish,2200)}
})();
