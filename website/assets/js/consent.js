/* =============================================================================
 * Lighthouse Barber Shop — souhlas (GDPR) + měřicí kódy
 * -----------------------------------------------------------------------------
 * Vše na jednom místě. ID jsou pouze zde, ne v HTML (výjimka: <noscript> Meta
 * Pixel v index.html — bez JS nelze ID předat jinak).
 *
 * Pořadí (dle Google Consent Mode v2):
 *   1) consent 'default' = denied  ── nastaveno JEŠTĚ PŘED načtením gtag.js
 *   2) gtag.js se načte s výchozím denied (cookieless pings / modelování)
 *   3) Meta Pixel se NENAČÍTÁ vůbec, dokud uživatel neudělí souhlas
 *   4) po kliknutí „Přijmout vše“ → consent 'update' = granted + načtení Pixelu
 *
 * Volba se ukládá do localStorage (CONFIG.STORAGE_KEY):
 *   'granted' | 'denied' | (nic) = banner se zobrazí
 * ========================================================================== */
(function () {
  'use strict';

  /* --- KONFIGURACE — jediné místo s ID ------------------------------------ */
  var CONFIG = {
    GOOGLE_ADS_ID: 'AW-16665212754',
    META_PIXEL_ID: '347501964648805',

    /* Conversion labels (část za lomítkem v send_to: AW-XXXX/LABEL).
     * Dokud je v hodnotě „TODO“, konverzní event se neodešle. */
    CONVERSION_LABELS: {
      /* Přeneseno 1:1 ze staré Readymag verze webu (custom code, ci_body_bottom):
       *   gtag('event','conversion',{ send_to: 'AW-16665212754/qZQRCIHt28gZENLuy4o-' })
       * Na starém webu se počítal JEDEN typ konverze — klik na tlačítko rezervace. */
      booking_click: 'qZQRCIHt28gZENLuy4o-',           // klik na „Objednat“ (alteg.io)

      /* Na starém webu klik na telefon jako konverze NEBYL. Samostatné sledování by
       * znamenalo NOVOU akci v Google Ads s vlastním labelem. Necháno vypnuté,
       * ať se přenos 1:1 nic nerozbije. Až vznikne, doplnit label sem. */
      phone_click:  'TODO_NEW_PHONE_CONVERSION_LABEL'
      // form_submit: na webu žádný formulář není
    },

    /* gtag.js dle Consent Mode v2 běžně načítáme vždy (s denied), aby Google
     * dostával anonymní pings a mohl modelovat konverze. Když by právník
     * trval na „žádná Google značka před souhlasem“, přepni na false. */
    LOAD_GTAG_ON_LOAD: true,

    STORAGE_KEY: 'lh-consent-v1',
    POLICY_URL: 'zasady-ochrany-osobnich-udaju.html'
  };

  var DENIED = {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied'
  };
  var GRANTED = {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted'
  };

  /* --- 1) Google Consent Mode v2 — DEFAULT = denied (před gtag.js) -------- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });
  gtag('set', 'url_passthrough', true);
  gtag('set', 'ads_data_redaction', true);
  gtag('js', new Date());
  gtag('config', CONFIG.GOOGLE_ADS_ID);

  /* --- 2) načtení gtag.js (respektuje denied stav výše) ------------------- */
  function loadGtag() {
    if (window.__lhGtagLoaded) return;
    window.__lhGtagLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CONFIG.GOOGLE_ADS_ID);
    document.head.appendChild(s);
  }
  if (CONFIG.LOAD_GTAG_ON_LOAD) loadGtag();

  /* --- 3) Meta Pixel — stub teď, načtení fbevents.js až po souhlasu ------ */
  if (!window.fbq) {
    var n = window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
  }
  /* dokud není souhlas, Pixel má odvolaný souhlas (nic neodesílá) */
  window.fbq('consent', 'revoke');

  function loadMetaPixel() {
    if (window.__lhPixelLoaded) return;
    window.__lhPixelLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
    window.fbq('consent', 'grant');
    window.fbq('init', CONFIG.META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  /* --- aplikace souhlasu -------------------------------------------------- */
  function applyGranted() {
    gtag('consent', 'update', GRANTED);
    loadGtag();           // pro případ LOAD_GTAG_ON_LOAD = false
    loadMetaPixel();
  }
  function applyDenied() {
    gtag('consent', 'update', DENIED);
    window.fbq('consent', 'revoke');
  }

  function readChoice() {
    try { return window.localStorage.getItem(CONFIG.STORAGE_KEY); }
    catch (e) { return null; }
  }
  function writeChoice(v) {
    try { window.localStorage.setItem(CONFIG.STORAGE_KEY, v); } catch (e) {}
  }

  /* --- 4) konverzní eventy --------------------------------------------------
   * gtag('event','conversion') respektuje Consent Mode (bez souhlasu se
   * modeluje / zahazuje). fbq existuje jen po souhlasu. */
  function trackConversion(key) {
    var label = CONFIG.CONVERSION_LABELS[key];
    if (label && label.indexOf('TODO') === -1) {
      gtag('event', 'conversion', { send_to: CONFIG.GOOGLE_ADS_ID + '/' + label });
    }
    if (window.__lhPixelLoaded) {
      if (key === 'booking_click') window.fbq('track', 'Lead');
      if (key === 'phone_click') window.fbq('track', 'Contact');
    }
  }
  window.lhTrackConversion = trackConversion; // pro ruční volání z konzole / testů

  function wireConversionTargets() {
    // klik na „Objednat“ — hero CTA, plovoucí CTA, tlačítka v sekci Kontakt
    document.querySelectorAll('a[href*="alteg.io"]').forEach(function (a) {
      a.addEventListener('click', function () { trackConversion('booking_click'); });
    });
    // klik na telefonní číslo
    document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
      a.addEventListener('click', function () { trackConversion('phone_click'); });
    });
    // formulář na webu zatím není — až přibude, přidat sem:
    // form.addEventListener('submit', function () { trackConversion('form_submit'); });
  }

  /* --- cookie banner ---------------------------------------------------------
   * position: fixed → nemá vliv na tok dokumentu → nulový CLS. */
  function buildBanner() {
    var wrap = document.createElement('div');
    wrap.className = 'cookie-banner';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Souhlas s používáním cookies');
    wrap.setAttribute('aria-live', 'polite');
    wrap.innerHTML =
      '<div class="cookie-banner__inner">' +
        '<p class="cookie-banner__text">' +
          'Používáme cookies a měřicí nástroje (Google Ads, Meta Pixel) k měření ' +
          'reklamy a její relevanci. Bez vašeho souhlasu se nespouštějí. ' +
          '<a class="cookie-banner__link" href="' + CONFIG.POLICY_URL + '">Zásady ochrany osobních údajů</a>.' +
        '</p>' +
        '<div class="cookie-banner__actions">' +
          '<button type="button" class="btn btn--ghost btn--compact" data-consent="deny">Odmítnout</button>' +
          '<button type="button" class="btn btn--primary btn--compact" data-consent="accept">Přijmout vše</button>' +
        '</div>' +
      '</div>';
    wrap.querySelector('[data-consent="accept"]').addEventListener('click', function () {
      writeChoice('granted'); applyGranted(); hideBanner();
    });
    wrap.querySelector('[data-consent="deny"]').addEventListener('click', function () {
      writeChoice('denied'); applyDenied(); hideBanner();
    });
    return wrap;
  }
  var bannerEl = null;
  function showBanner() {
    if (bannerEl) return;
    bannerEl = buildBanner();
    document.body.appendChild(bannerEl);
    document.body.classList.add('has-cookie-banner');
    requestAnimationFrame(function () { bannerEl.classList.add('is-visible'); });
  }
  function hideBanner() {
    if (!bannerEl) return;
    bannerEl.classList.remove('is-visible');
    document.body.classList.remove('has-cookie-banner');
    var el = bannerEl; bannerEl = null;
    window.setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 300);
  }

  /* veřejné API — odkaz „Nastavení cookies“ v patičce / na stránce zásad */
  window.lhOpenConsent = function () {
    hideBanner();
    showBanner();
  };

  /* --- init ------------------------------------------------------------------ */
  function init() {
    var choice = readChoice();
    if (choice === 'granted') {
      applyGranted();
    } else if (choice === 'denied') {
      /* výchozí stav už je denied, nic dalšího netřeba */
    } else {
      showBanner();
    }
    wireConversionTargets();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
