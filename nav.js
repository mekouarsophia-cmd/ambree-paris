/* Menu déroulant « Prestations » : ouverture au toucher (iPad, mobile)
   et fermeture quand on touche ailleurs. Au survol sur ordinateur, c'est le CSS qui gère. */
document.addEventListener('click', function (e) {
  var btn = e.target.closest('.nav-drop-btn');
  document.querySelectorAll('.nav-drop.open').forEach(function (d) {
    if (!btn || d !== btn.parentNode) d.classList.remove('open');
  });
  if (btn) {
    var drop = btn.parentNode;
    drop.classList.toggle('open');
    btn.setAttribute('aria-expanded', drop.classList.contains('open') ? 'true' : 'false');
  }
});
