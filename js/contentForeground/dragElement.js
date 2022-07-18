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
    document.onmouseup = null, document.onmousemove = null;
  }
  document.getElementById(e.id + 'header') ? document.getElementById(e.id + 'header').onmousedown = d : e.onmousedown = d;
}

function setModal (e, t, n) {
  let o = document.getElementById(n);
  o || (o = {
    offsetLeft: 0,
    offsetTop: 0
  });
  const l = document.getElementById('wediv'),
    d = document.getElementById('weIFrame'),
    f = window.pageYOffset || document.documentElement.scrollTop;
  l.hidden = !e, l.style.left = o.offsetLeft + 300 + 'px', l.style.top = o.offsetTop + f + 'px', t && t.length && (d.src = t), dragElement(l);
}
