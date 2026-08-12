import{a as e}from"./rolldown-runtime-CNC7AqOf.js";import{t}from"./react-9ZasmZpi.js";import{t as n}from"./createLucideIcon-Bj1u5GgP.js";import{t as r}from"./jsx-runtime-DiK4U9sA.js";import{t as i}from"./AdminShell-BVmHDySF.js";import{t as a}from"./useServerFn-B8uienVj.js";import{t as o}from"./loader-circle-BFAk7i7c.js";import{t as s}from"./download-EVmnu9uA.js";import{t as c}from"./file-text-B3s7GTyp.js";import{$ as l,Cn as u,En as d,Tn as f,b as p,mn as m,n as h,y as g,yn as _}from"./index-cB4EQfLF.js";import{t as v}from"./input-DF4Fewfp.js";import{o as y,r as b,s as x,t as S}from"./dist-lzLcoUar.js";import{t as C}from"./dist-Y8kM6Q3p.js";import{t as w}from"./dist-16FRuZJ4.js";import{a as T,n as ee,o as te,t as E}from"./dialog-Bciaz5yD.js";import{i as D}from"./categories-Bsiyh0g1.js";import{t as O}from"./dist-C2J943E6.js";import{n as k,t as A}from"./dist-DRTj_fhr.js";var ne=n(`printer`,[[`path`,{d:`M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2`,key:`143wyd`}],[`path`,{d:`M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6`,key:`1itne7`}],[`rect`,{x:`6`,y:`14`,width:`12`,height:`8`,rx:`1`,key:`1ue0tg`}]]),j=e(t(),1),M=r(),N=[`PageUp`,`PageDown`],P=[`ArrowUp`,`ArrowDown`,`ArrowLeft`,`ArrowRight`],F={"from-left":[`Home`,`PageDown`,`ArrowDown`,`ArrowLeft`],"from-right":[`Home`,`PageDown`,`ArrowDown`,`ArrowRight`],"from-bottom":[`Home`,`PageDown`,`ArrowDown`,`ArrowLeft`],"from-top":[`Home`,`PageDown`,`ArrowUp`,`ArrowLeft`]},I=`Slider`,[L,re,ie]=A(I),[R,ae]=y(I,[ie]),[oe,z]=R(I),B=j.forwardRef((e,t)=>{let{name:n,min:r=0,max:i=100,step:a=1,orientation:o=`horizontal`,disabled:s=!1,minStepsBetweenThumbs:c=0,defaultValue:l=[r],value:u,onValueChange:d=()=>{},onValueCommit:f=()=>{},inverted:p=!1,form:m,...h}=e,g=j.useRef(new Set),_=j.useRef(0),v=j.useRef(!1),y=o===`horizontal`?se:ce,[S=[],C]=b({prop:u,defaultProp:l,onChange:e=>{[...g.current][_.current]?.focus({preventScroll:!0,focusVisible:v.current}),v.current=!1,d(e)}}),w=j.useRef(S);function T(e){E(e,ve(S,e))}function ee(e){E(e,_.current)}function te(){let e=w.current[_.current];S[_.current]!==e&&f(S)}function E(e,t,{commit:n}={commit:!1}){let o=Se(a),s=O(Ce(Math.round((e-r)/a)*a+r,o),[r,i]);C((e=[])=>{let r=he(e,s,t);if(xe(r,c*a)){_.current=r.indexOf(s);let t=String(r)!==String(e);return t&&n&&f(r),t?r:e}else return e})}return(0,M.jsx)(oe,{scope:e.__scopeSlider,name:n,disabled:s,min:r,max:i,valueIndexToChangeRef:_,thumbs:g.current,values:S,orientation:o,form:m,children:(0,M.jsx)(L.Provider,{scope:e.__scopeSlider,children:(0,M.jsx)(L.Slot,{scope:e.__scopeSlider,children:(0,M.jsx)(y,{"aria-disabled":s,"data-disabled":s?``:void 0,...h,ref:t,onPointerDown:x(h.onPointerDown,()=>{s||(w.current=S,v.current=!1)}),min:r,max:i,inverted:p,onSlideStart:s?void 0:T,onSlideMove:s?void 0:ee,onSlideEnd:s?void 0:te,onHomeKeyDown:()=>{s||(v.current=!0,E(r,0,{commit:!0}))},onEndKeyDown:()=>{s||(v.current=!0,E(i,S.length-1,{commit:!0}))},onStepKeyDown:({event:e,direction:t})=>{if(!s){v.current=!0;let n=N.includes(e.key)||e.shiftKey&&P.includes(e.key)?10:1,r=_.current,i=S[r];E(i+a*n*t,r,{commit:!0})}}})})})})});B.displayName=I;var[V,H]=R(I,{startEdge:`left`,endEdge:`right`,size:`width`,direction:1}),se=j.forwardRef((e,t)=>{let{min:n,max:r,dir:i,inverted:a,onSlideStart:o,onSlideMove:s,onSlideEnd:c,onStepKeyDown:l,...d}=e,[f,p]=j.useState(null),m=u(t,p),h=j.useRef(void 0),g=k(i),_=g===`ltr`,v=_&&!a||!_&&a;function y(e){let t=h.current||f.getBoundingClientRect(),i=Q([0,t.width],v?[n,r]:[r,n]);return h.current=t,i(e-t.left)}return(0,M.jsx)(V,{scope:e.__scopeSlider,startEdge:v?`left`:`right`,endEdge:v?`right`:`left`,direction:v?1:-1,size:`width`,children:(0,M.jsx)(U,{dir:g,"data-orientation":`horizontal`,...d,ref:m,style:{...d.style,"--radix-slider-thumb-transform":`translateX(-50%)`},onSlideStart:e=>{let t=y(e.clientX);o?.(t)},onSlideMove:e=>{let t=y(e.clientX);s?.(t)},onSlideEnd:()=>{h.current=void 0,c?.()},onStepKeyDown:e=>{let t=F[v?`from-left`:`from-right`].includes(e.key);l?.({event:e,direction:t?-1:1})}})})}),ce=j.forwardRef((e,t)=>{let{min:n,max:r,inverted:i,onSlideStart:a,onSlideMove:o,onSlideEnd:s,onStepKeyDown:c,...l}=e,d=j.useRef(null),f=u(t,d),p=j.useRef(void 0),m=!i;function h(e){let t=p.current||d.current.getBoundingClientRect(),i=Q([0,t.height],m?[r,n]:[n,r]);return p.current=t,i(e-t.top)}return(0,M.jsx)(V,{scope:e.__scopeSlider,startEdge:m?`bottom`:`top`,endEdge:m?`top`:`bottom`,size:`height`,direction:m?1:-1,children:(0,M.jsx)(U,{"data-orientation":`vertical`,...l,ref:f,style:{...l.style,"--radix-slider-thumb-transform":`translateY(50%)`},onSlideStart:e=>{let t=h(e.clientY);a?.(t)},onSlideMove:e=>{let t=h(e.clientY);o?.(t)},onSlideEnd:()=>{p.current=void 0,s?.()},onStepKeyDown:e=>{let t=F[m?`from-bottom`:`from-top`].includes(e.key);c?.({event:e,direction:t?-1:1})}})})}),U=j.forwardRef((e,t)=>{let{__scopeSlider:n,onSlideStart:r,onSlideMove:i,onSlideEnd:a,onHomeKeyDown:o,onEndKeyDown:s,onStepKeyDown:c,...l}=e,u=z(I,n);return(0,M.jsx)(S.span,{...l,ref:t,onKeyDown:x(e.onKeyDown,e=>{e.key===`Home`?(o(e),e.preventDefault()):e.key===`End`?(s(e),e.preventDefault()):N.concat(P).includes(e.key)&&(c(e),e.preventDefault())}),onPointerDown:x(e.onPointerDown,e=>{let t=e.target;t.setPointerCapture(e.pointerId),e.preventDefault(),u.thumbs.has(t)?t.focus({preventScroll:!0,focusVisible:!1}):r(e)}),onPointerMove:x(e.onPointerMove,e=>{e.target.hasPointerCapture(e.pointerId)&&i(e)}),onPointerUp:x(e.onPointerUp,e=>{let t=e.target;t.hasPointerCapture(e.pointerId)&&(t.releasePointerCapture(e.pointerId),a(e))})})}),W=`SliderTrack`,G=j.forwardRef((e,t)=>{let{__scopeSlider:n,...r}=e,i=z(W,n);return(0,M.jsx)(S.span,{"data-disabled":i.disabled?``:void 0,"data-orientation":i.orientation,...r,ref:t})});G.displayName=W;var K=`SliderRange`,q=j.forwardRef((e,t)=>{let{__scopeSlider:n,...r}=e,i=z(K,n),a=H(K,n),o=u(t,j.useRef(null)),s=i.values.length,c=i.values.map(e=>ge(e,i.min,i.max)),l=s>1?Math.min(...c):0,d=100-Math.max(...c);return(0,M.jsx)(S.span,{"data-orientation":i.orientation,"data-disabled":i.disabled?``:void 0,...r,ref:o,style:{...e.style,[a.startEdge]:l+`%`,[a.endEdge]:d+`%`}})});q.displayName=K;var J=`SliderThumb`,[le,Y]=R(J),X=`SliderThumbProvider`;function ue(e){let{__scopeSlider:t,name:n,children:r,internal_do_not_use_render:i}=e,a=z(X,t),o=re(t),[s,c]=j.useState(null),l=j.useMemo(()=>s?o().findIndex(e=>e.ref.current===s):-1,[o,s]),u=w(s),d=s?!!a.form||!!s.closest(`form`):!0,f=a.values[l],p=n??(a.name?a.name+(a.values.length>1?`[]`:``):void 0),m=f===void 0?0:ge(f,a.min,a.max);j.useEffect(()=>{if(s)return a.thumbs.add(s),()=>{a.thumbs.delete(s)}},[s,a.thumbs]);let h={value:f,name:p,form:a.form,isFormControl:d,index:l,thumb:s,onThumbChange:c,percent:m,size:u};return(0,M.jsx)(le,{scope:t,...h,children:we(i)?i(h):r})}ue.displayName=X;var Z=`SliderThumbTrigger`,de=j.forwardRef((e,t)=>{let{__scopeSlider:n,...r}=e,i=z(Z,n),a=H(Z,n),{index:o,value:s,percent:c,size:l,onThumbChange:d}=Y(Z,n),f=u(t,d),p=_e(o,i.values.length),m=l?.[a.size],h=m?ye(m,c,a.direction):0;return(0,M.jsx)(`span`,{style:{transform:`var(--radix-slider-thumb-transform)`,position:`absolute`,[a.startEdge]:`calc(${c}% + ${h}px)`},children:(0,M.jsx)(L.ItemSlot,{scope:n,children:(0,M.jsx)(S.span,{role:`slider`,"aria-label":e[`aria-label`]||p,"aria-valuemin":i.min,"aria-valuenow":s,"aria-valuemax":i.max,"aria-orientation":i.orientation,"data-orientation":i.orientation,"data-disabled":i.disabled?``:void 0,tabIndex:i.disabled?void 0:0,...r,ref:f,style:s===void 0?{display:`none`}:e.style,onFocus:x(e.onFocus,()=>{i.valueIndexToChangeRef.current=o})})})})});de.displayName=Z;var fe=j.forwardRef((e,t)=>{let{__scopeSlider:n,name:r,...i}=e;return(0,M.jsx)(ue,{__scopeSlider:n,name:r,internal_do_not_use_render:({index:e,isFormControl:r})=>(0,M.jsxs)(M.Fragment,{children:[(0,M.jsx)(de,{...i,ref:t,__scopeSlider:n}),r?(0,M.jsx)(me,{__scopeSlider:n},e):null]})})});fe.displayName=J;var pe=`SliderBubbleInput`,me=j.forwardRef(({__scopeSlider:e,...t},n)=>{let{value:r,name:i,form:a}=Y(pe,e),o=j.useRef(null),s=u(o,n),c=C(r);return j.useEffect(()=>{let e=o.current;if(!e)return;let t=window.HTMLInputElement.prototype,n=Object.getOwnPropertyDescriptor(t,`value`).set;if(c!==r&&n){let t=new Event(`input`,{bubbles:!0});n.call(e,r),e.dispatchEvent(t)}},[c,r]),(0,M.jsx)(S.input,{style:{display:`none`},name:i,form:a,...t,ref:s,defaultValue:r})});me.displayName=pe;function he(e=[],t,n){let r=[...e];return r[n]=t,r.sort((e,t)=>e-t)}function ge(e,t,n){return O(100/(n-t)*(e-t),[0,100])}function _e(e,t){if(t>2)return`Value ${e+1} of ${t}`;if(t===2)return[`Minimum`,`Maximum`][e]}function ve(e,t){if(e.length===1)return 0;let n=e.map(e=>Math.abs(e-t)),r=Math.min(...n);return n.indexOf(r)}function ye(e,t,n){let r=e/2;return(r-Q([0,50],[0,r])(t)*n)*n}function be(e){return e.slice(0,-1).map((t,n)=>e[n+1]-t)}function xe(e,t){if(t>0){let n=be(e);return Math.min(...n)>=t}return!0}function Q(e,t){return n=>{if(e[0]===e[1]||t[0]===t[1])return t[0];let r=(t[1]-t[0])/(e[1]-e[0]);return t[0]+r*(n-e[0])}}function Se(e){if(!Number.isFinite(e))return 0;let t=e.toString();if(t.includes(`e`)){let[e,n]=t.split(`e`),r=e.split(`.`)[1]||``,i=Number(n);return Math.max(0,r.length-i)}let n=t.split(`.`)[1];return n?n.length:0}function Ce(e,t){let n=10**t;return Math.round(e*n)/n}function we(e){return typeof e==`function`}var Te=j.forwardRef(({className:e,...t},n)=>(0,M.jsxs)(B,{ref:n,className:d(`relative flex w-full touch-none select-none items-center`,e),...t,children:[(0,M.jsx)(G,{className:`relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20`,children:(0,M.jsx)(q,{className:`absolute h-full bg-primary`})}),(0,M.jsx)(fe,{className:`block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50`})]}));Te.displayName=B.displayName;var $=e=>{let t=e.match(/```(?:html)?\s*([\s\S]*?)\s*```/i);return t?t[1]:e.replace(/```/g,``)};function Ee(){let{token:e}=l(),t=a(h),n=a(p),r=a(g),[i,u]=(0,j.useState)(!1),[d,y]=(0,j.useState)(!1),[b,x]=(0,j.useState)(!1),[S,C]=(0,j.useState)(null),[w,O]=(0,j.useState)(()=>{if(typeof window>`u`)return D;try{return JSON.parse(localStorage.getItem(`campusxpose_keywords`)||`null`)??D}catch{return D}}),[k,A]=(0,j.useState)(``),[N,P]=(0,j.useState)(6),F=e=>{O(e),localStorage.setItem(`campusxpose_keywords`,JSON.stringify(e))};return(0,M.jsxs)(M.Fragment,{children:[(0,M.jsx)(E,{open:!!S,onOpenChange:e=>!e&&C(null),children:(0,M.jsxs)(ee,{className:`max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible`,children:[(0,M.jsxs)(T,{className:`print:hidden flex flex-row items-center justify-between border-b pb-4`,children:[(0,M.jsx)(te,{children:`AI Analysis Report`}),(0,M.jsxs)(_,{onClick:()=>{let e=document.createElement(`iframe`);e.style.position=`fixed`,e.style.right=`0`,e.style.bottom=`0`,e.style.width=`0`,e.style.height=`0`,e.style.border=`0`,document.body.appendChild(e);let t=e.contentWindow?.document;t&&(t.open(),t.write(`
        <html>
          <head>
            <title>CampusXpose AI Analysis</title>
            <style>
              body {
                font-family: 'Inter', system-ui, sans-serif;
                padding: 40px;
                color: #0f172a;
              }
              h1, h2, h3 { font-weight: 800; color: #0f172a; margin-top: 0; }
              h2 { font-size: 1.5rem; border-bottom: 3px solid #0f172a; padding-bottom: 0.5rem; margin-top: 2rem; margin-bottom: 1rem; }
              h3 { font-size: 1.25rem; margin-top: 1.5rem; margin-bottom: 0.75rem; }
              p { line-height: 1.6; color: #334155; margin-bottom: 1rem; }
              strong { color: #dc2626; }
              ul, ol { background: #f8fafc; border: 2px solid #0f172a; border-radius: 8px; padding: 1.5rem 1.5rem 1.5rem 2.5rem; margin-bottom: 1.5rem; }
              li { margin-bottom: 0.5rem; }
              
              /* Beautiful Table Styling */
              table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 2rem; background: #fff; border: 2px solid #0f172a; border-radius: 8px; }
              th, td { padding: 1rem; text-align: left; border-bottom: 2px solid #0f172a; }
              th { background: #f1f5f9; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.05em; font-weight: 800; color: #0f172a; }
              td:not(:last-child), th:not(:last-child) { border-right: 2px solid #0f172a; }
              tr:last-child td { border-bottom: none; }
              
              /* Header */
              .header { display: flex; align-items: center; gap: 16px; margin-bottom: 30px; border-bottom: 4px solid #0f172a; padding-bottom: 20px; }
              .header img { width: 60px; height: 60px; border-radius: 8px; border: 2px solid #0f172a; }
              .header h1 { margin: 0; font-size: 28px; }
              
              /* Print optimizations to prevent page breaks inside elements */
              @media print {
                table, ul, ol { page-break-inside: avoid; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                h2, h3 { page-break-after: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="${window.location.origin}/logo.jpeg" alt="Logo" />
              <h1>CampusXpose Analysis</h1>
            </div>
            ${$(S||``)}
          </body>
        </html>
      `),t.close(),e.contentWindow?.focus(),setTimeout(()=>{e.contentWindow?.print(),setTimeout(()=>{document.body.removeChild(e)},1e3)},500))},className:`bg-primary text-white`,children:[(0,M.jsx)(ne,{className:`mr-2 w-4 h-4`}),` Print PDF`]})]}),(0,M.jsxs)(`div`,{id:`printable-report`,className:`p-8 bg-white text-black min-h-screen`,children:[(0,M.jsx)(`style`,{children:`
              /* Sketch Theme for AI HTML Output Preview */
              #printable-report {
                font-family: 'Inter', system-ui, sans-serif;
              }
              #printable-report h1, #printable-report h2, #printable-report h3 {
                font-weight: 800;
                color: #0f172a;
              }
              #printable-report h2 {
                font-size: 1.75rem;
                margin-top: 2rem;
                margin-bottom: 1rem;
                border-bottom: 3px solid #0f172a;
                padding-bottom: 0.5rem;
              }
              #printable-report h3 {
                font-size: 1.25rem;
                margin-top: 1.5rem;
                margin-bottom: 0.75rem;
              }
              #printable-report p {
                line-height: 1.7;
                margin-bottom: 1rem;
                color: #334155;
              }
              #printable-report strong {
                color: #dc2626;
                font-weight: 700;
              }
              #printable-report ul, #printable-report ol {
                margin-bottom: 1.5rem;
                padding: 1.25rem 1.25rem 1.25rem 2.5rem;
                background-color: #f8fafc;
                border: 2px solid #0f172a;
                border-radius: 8px;
                box-shadow: 4px 4px 0 #0f172a;
              }
              #printable-report li {
                margin-bottom: 0.5rem;
                color: #334155;
              }
              #printable-report li::marker {
                color: #0f172a;
                font-weight: 800;
              }
              /* Tables */
              #printable-report table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 1rem;
                margin-bottom: 2rem;
                background-color: #fff;
                border: 2px solid #0f172a;
                border-radius: 8px;
                box-shadow: 4px 4px 0 #0f172a;
                overflow: hidden;
              }
              #printable-report th, #printable-report td {
                padding: 1rem;
                text-align: left;
                border-bottom: 2px solid #0f172a;
              }
              #printable-report th {
                background-color: #f1f5f9;
                font-weight: 800;
                color: #0f172a;
                text-transform: uppercase;
                font-size: 0.85rem;
                letter-spacing: 0.05em;
              }
              #printable-report tr:last-child td {
                border-bottom: none;
              }
              #printable-report td:not(:last-child), #printable-report th:not(:last-child) {
                border-right: 2px solid #0f172a;
              }
            `}),(0,M.jsxs)(`div`,{className:`flex items-center gap-4 mb-8 pb-6 border-b-4 border-gray-900`,children:[(0,M.jsx)(`img`,{src:`/logo.jpeg`,className:`w-14 h-14 rounded-lg border-2 border-gray-900`,alt:`Logo`}),(0,M.jsx)(`h1`,{className:`text-3xl font-black text-gray-900 m-0`,children:`CampusXpose Analysis`})]}),(0,M.jsx)(`div`,{dangerouslySetInnerHTML:{__html:$(S||``)}})]})]})}),(0,M.jsxs)(`div`,{className:`space-y-8 print:hidden`,children:[(0,M.jsx)(`h1`,{className:`text-2xl font-bold`,children:`AI Control`}),(0,M.jsxs)(`section`,{className:`rounded-xl border border-border bg-surface p-5`,children:[(0,M.jsxs)(`h2`,{className:`mb-3 flex items-center gap-2 font-semibold`,children:[(0,M.jsx)(m,{className:`h-5 w-5 text-primary`}),` OpenRouter Advanced Analysis`]}),(0,M.jsx)(`p`,{className:`text-sm text-muted-foreground mb-4`,children:`Uses OpenRouter API (Nemotron-3) to perform a deep analysis of user behavior, incidents, colleges, and feedback across the entire website (excluding direct messages). Generates a beautifully formatted PDF report with logo.`}),(0,M.jsxs)(_,{disabled:d,onClick:async()=>{y(!0),f.info(`AI is analyzing the entire website... This might take a minute.`);try{C((await r({data:{token:e}})).reportHtml),f.success(`Analysis Complete!`)}catch(e){f.error(e?.message??`Failed to generate report`)}finally{y(!1)}},className:`rounded-full bg-[#2d5da1] hover:bg-[#2d5da1]/90 text-white`,children:[d?(0,M.jsx)(o,{className:`mr-2 h-4 w-4 animate-spin`}):(0,M.jsx)(s,{className:`mr-2 h-4 w-4`}),d?`Analyzing Data...`:`Generate Advanced PDF Report`]})]}),(0,M.jsxs)(`section`,{className:`rounded-xl border border-border bg-surface p-5`,children:[(0,M.jsxs)(`h2`,{className:`mb-3 flex items-center gap-2 font-semibold`,children:[(0,M.jsx)(m,{className:`h-5 w-5 text-primary`}),` Pending Analysis`]}),(0,M.jsxs)(_,{disabled:i,className:`rounded-full`,onClick:async()=>{u(!0);try{let n=await t({data:{token:e}});f.success(`${n.processed} analyzed, ${n.failed} failed${n.remaining?` · more pending, run again`:``}`)}catch(e){f.error(e?.message??`Failed`)}finally{u(!1)}},children:[i?(0,M.jsx)(o,{className:`mr-1 h-4 w-4 animate-spin`}):null,` Analyze All Now`]})]}),(0,M.jsxs)(`section`,{className:`rounded-xl border border-border bg-surface p-5`,children:[(0,M.jsxs)(`h2`,{className:`mb-3 flex items-center gap-2 font-semibold`,children:[(0,M.jsx)(c,{className:`h-5 w-5 text-primary`}),` Daily Report (Legacy)`]}),(0,M.jsxs)(_,{disabled:b,variant:`outline`,className:`rounded-full`,onClick:async()=>{x(!0),f.info(`Generating daily report...`);try{C((await n({data:{token:e}})).report),f.success(`Report Generated!`)}catch(e){f.error(e?.message??`Failed to generate report`)}finally{x(!1)}},children:[b?(0,M.jsx)(o,{className:`mr-2 h-4 w-4 animate-spin`}):(0,M.jsx)(c,{className:`mr-2 h-4 w-4`}),b?`Generating...`:`Generate Today's Report`]})]}),(0,M.jsxs)(`section`,{className:`rounded-xl border border-border bg-surface p-5`,children:[(0,M.jsx)(`h2`,{className:`mb-3 font-semibold`,children:`Incident Keywords`}),(0,M.jsx)(`div`,{className:`flex flex-wrap gap-2`,children:w.map(e=>(0,M.jsxs)(`span`,{className:`inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-sm`,children:[e,(0,M.jsx)(`button`,{className:`text-destructive`,onClick:()=>F(w.filter(t=>t!==e)),children:`×`})]},e))}),(0,M.jsxs)(`div`,{className:`mt-3 flex gap-2`,children:[(0,M.jsx)(v,{value:k,onChange:e=>A(e.target.value),placeholder:`Add keyword`,className:`bg-surface-2`}),(0,M.jsx)(_,{onClick:()=>{k.trim()&&(F([...w,k.trim()]),A(``))},children:`Add`})]}),(0,M.jsxs)(`div`,{className:`mt-5`,children:[(0,M.jsxs)(`span`,{className:`text-sm text-muted-foreground`,children:[`Sensitivity: `,N]}),(0,M.jsx)(Te,{value:[N],min:1,max:10,step:1,onValueChange:e=>P(e[0]),className:`mt-1 max-w-sm`}),(0,M.jsx)(`p`,{className:`mt-1 text-xs text-muted-foreground`,children:`Higher sensitivity = more false positives.`})]})]})]})]})}var De=()=>(0,M.jsx)(i,{children:(0,M.jsx)(Ee,{})});export{De as component};