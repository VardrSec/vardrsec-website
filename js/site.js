(function(){
  const btn = document.getElementById("menuBtn");
  const panel = document.getElementById("mobilePanel");
  
  if(btn && panel){
    btn.addEventListener("click", () => {
      panel.classList.toggle("open");
      btn.setAttribute("aria-expanded", panel.classList.contains("open") ? "true" : "false");
    });
  }
})();
