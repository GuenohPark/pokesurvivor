(function () {
  'use strict';

  var PLATFORMS = ['pc', 'android', 'iphone'];
  var INSTALL_URL = 'https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor.user.js';

  // Advisory only. This does not inspect installed extensions or modify the UA.
  function detectPlatform(nav) {
    nav = nav || {};
    var ua = String(nav.userAgent || '');
    var platform = String(nav.platform || '');
    var touchPoints = Number(nav.maxTouchPoints) || 0;
    if (/iPhone|iPad|iPod/i.test(ua) || ((/Mac/i.test(platform) || /Macintosh/i.test(ua)) && touchPoints > 1)) return 'iphone';
    if (/Android/i.test(ua)) return 'android';
    return 'pc';
  }

  function isSafeUrl(value) {
    if (typeof value !== 'string' || /[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
    try {
      var url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password;
    } catch (_) {
      return false;
    }
  }

  function init(doc, nav) {
    if (!doc) return null;
    var tabs = Array.from(doc.querySelectorAll('[data-platform-tab]'));
    var panels = Array.from(doc.querySelectorAll('[data-platform-panel]'));
    var tablist = doc.querySelector('.platform-tabs');
    var advisory = doc.getElementById('device-advisory');
    if (tabs.length !== 3 || panels.length !== 3 || !tablist || !advisory) return null;
    var selected = detectPlatform(nav);
    var labels = { pc: 'PC', android: 'Android', iphone: 'iPhone / iPad' };

    function selectPlatform(value, manual) {
      if (PLATFORMS.indexOf(value) === -1) return false;
      selected = value;
      tabs.forEach(function (tab) {
        var active = tab.getAttribute('data-platform-tab') === value;
        tab.setAttribute('aria-selected', String(active));
        tab.setAttribute('tabindex', active ? '0' : '-1');
      });
      panels.forEach(function (panel) {
        var key = panel.getAttribute('data-platform-panel');
        panel.hidden = key !== value;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', 'tab-' + key);
        panel.setAttribute('tabindex', '0');
      });
      advisory.textContent = manual
        ? labels[value] + ' 안내를 직접 선택했습니다. 설치 파일은 모든 기기에서 같습니다.'
        : '브라우저 정보에 따른 추천: ' + labels[value] + '. 실제 사용할 기기는 아래에서 직접 바꿀 수 있습니다. 확장 설치 여부는 확인하지 않습니다.';
      return true;
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () {
        selectPlatform(tab.getAttribute('data-platform-tab'), true);
      });
      tab.addEventListener('keydown', function (event) {
        var next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        selectPlatform(tabs[next].getAttribute('data-platform-tab'), true);
        tabs[next].focus();
      });
    });
    selectPlatform(selected, false);
    tablist.hidden = false;
    return { selectPlatform: selectPlatform, getPlatform: function () { return selected; } };
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { detectPlatform: detectPlatform, isSafeUrl: isSafeUrl, init: init, INSTALL_URL: INSTALL_URL };
  }
  if (typeof document !== 'undefined') {
    init(document, typeof navigator !== 'undefined' ? navigator : {});
  }
}());
