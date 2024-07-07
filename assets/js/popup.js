document.getElementById('open-tab').addEventListener('click', function() {
  browser.tabs.create({
    url: 'https://www.example.com'
  });
});
