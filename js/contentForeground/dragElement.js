/* global createWediv */

function dragElement (e) {
  let l = 0,
    n = 0,
    o = 0,
    t = 0;

  function d (e) {
    (e = e || window.event).preventDefault(), o = e.clientX, l = e.clientY, document.onmouseup = s, document.onmousemove = f;
  }

  function f (d) {
    (d = d || window.event).preventDefault(), t = o - d.clientX, n = l - d.clientY, o = d.clientX, l = d.clientY, e.style.top = e.offsetTop - n + 'px', e.style.left = e.offsetLeft - t + 'px';
  }

  function s () {
    document.onmouseup = null;
    document.onmousemove = null;
  }
  document.getElementById(e.id + 'header') ? document.getElementById(e.id + 'header').onmousedown = d : e.onmousedown = d;
}

// eslint-disable-next-line no-unused-vars
function setModal (e, t, n) {
  console.log('------- setModal setModal setModal --------- t', t,n);
  let o = document.getElementById(n);
  o || (o = {
    offsetLeft: 0,
    offsetTop: 0
  });
  const f = window.scrollY || document.documentElement.scrollTop;
  let d = document.getElementById('weIFrame');
  let l = document.getElementById('wediv');
  if (!l) {
    console.log('------- setModal setModal setModal     no wediv, so creating one --------- ');
    createWediv();
    l = document.getElementById('wediv');
    d = document.getElementById('weIFrame');
    console.log('------- setModal setModal setModal     created wediv: ', l);
  }
  console.log('------- setModal setModal setModal   l  : ', l);
  l.hidden = !e;
  l.style.left = o.offsetLeft + 300 + 'px';
  l.style.top = o.offsetTop + f + 'px';
  t && t.length && (d.src = t);
  dragElement(l);
}

// eslint-disable-next-line no-unused-vars
function isModalDisplayed () {
  const l = document.getElementById('wediv');
  return !l.hidden;
}
