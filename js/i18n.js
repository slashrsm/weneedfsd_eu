/* WeNeedFSD.eu — path locale, asset prefix, t(), JSON load. */

(function (global) {
  "use strict";

  var dict = null;

  function localeFromPath() {
    var path = (global.location && global.location.pathname) || "";
    path = path.replace(/\/index\.html$/i, "/");
    if (/\/sl\/?$/.test(path)) return "sl";
    if (/\/it\/?$/.test(path)) return "it";
    return "en";
  }

  function asset(rel) {
    rel = String(rel || "").replace(/^\.\//, "");
    return localeFromPath() === "en" ? rel : "../" + rel;
  }

  function lookup(obj, path) {
    if (!obj || path == null) return undefined;
    var parts = String(path).split(".");
    var cur = obj;
    var i;
    for (i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== "object") return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function interpolate(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (_, key) {
      if (!vars || vars[key] == null) return "";
      return String(vars[key]);
    });
  }

  function t(path, vars) {
    var val = lookup(dict, path);
    if (val == null) return path;
    if (typeof val === "string") {
      return vars ? interpolate(val, vars) : val;
    }
    return val;
  }

  function lettersReviewed() {
    return !!(dict && dict.letters === "reviewed");
  }

  function localeHome(loc) {
    loc = loc || localeFromPath();
    return loc === "en" ? "/" : "/" + loc + "/";
  }

  async function loadI18n() {
    var locale = localeFromPath();
    var url = asset("i18n/" + locale + ".json");
    try {
      var res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error(String(res.status));
      dict = await res.json();
    } catch (err) {
      var embed = global.document && global.document.getElementById("i18n-data");
      if (embed && embed.textContent) {
        dict = JSON.parse(embed.textContent);
      } else {
        throw err;
      }
    }
    if (dict && !dict.locale) dict.locale = locale;
    return dict;
  }

  global.localeFromPath = localeFromPath;
  global.asset = asset;
  global.t = t;
  global.loadI18n = loadI18n;
  global.lettersReviewed = lettersReviewed;
  global.localeHome = localeHome;
})(window);
