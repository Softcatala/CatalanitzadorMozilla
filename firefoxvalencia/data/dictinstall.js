$(window).click(function (event) {
  var t = event.target;

  // Don't intercept the click if it isn't on a link.
  //if (t.nodeName != "A")
  //  return;

  // Don't intercept the click if it was on one of the links in the header
  // or next/previous footer, since those links should load in the panel itself.
  if ($(t).parents('#header').length || $(t).parents('.nextprev').length)
    return;

  console.log("click!");

  // Intercept the click, passing it to the addon, which will load it in a tab.
  event.stopPropagation();
  event.preventDefault();
  self.port.emit('click', t.toString());
});

// CSS
$("body").css("background", "white");
