/* ============================================
   فاطمة بوت - نظام الملفات الشخصية
   المنطق الرئيسي
   ============================================ */

var App = (function () {
  'use strict';

  var BASE = '/user-info-site';

  /* --- أصناف اللاعبين --- */
  var CLASSES = {
    '\u0645\u062d\u0627\u0631\u0628': { av: 'av-warrior', color: '#ef4444', icon: '\u2694' },
    '\u0633\u0627\u062d\u0631': { av: 'av-mage', color: '#8b5cf6', icon: '\u2728' },
    '\u0631\u0627\u0645\u064a': { av: 'av-archer', color: '#22c55e', icon: '\u27B6' },
    '\u0634\u0627\u0641\u064a': { av: 'av-healer', color: '#ec4899', icon: '\u2665' },
    '\u0642\u0627\u062a\u0644': { av: 'av-assassin', color: '#f97316', icon: '\u2020' },
    '\u0641\u0627\u0631\u0633': { av: 'av-knight', color: '#3b82f6', icon: '\u26E8' }
  };

  var RARITY = {
    '\u0634\u0627\u0626\u0639': { cls: 'common', color: '#9ca3af' },
    '\u0646\u0627\u062f\u0631': { cls: 'rare', color: '#3b82f6' },
    '\u0645\u0644\u062d\u0645\u064a': { cls: 'epic', color: '#a855f7' },
    '\u0623\u0633\u0637\u0648\u0631\u064a': { cls: 'legendary', color: '#eab308' }
  };

  /* --- دوال مساعدة --- */

  function normJid(jid) {
    if (!jid) return jid;
    return jid.replace(/@lid$/, '@s.whatsapp.net');
  }

  function xpFor(lv) { return Math.floor(100 * Math.pow(1.25, lv - 1)); }

  function fmtNum(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + '\u0645';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + '\u0643';
    return String(n);
  }

  function arNum(n) {
    var d = ['\u0660','\u0661','\u0662','\u0663','\u0664','\u0665','\u0666','\u0667','\u0668','\u0669'];
    return String(n).replace(/[0-9]/g, function(c){ return d[parseInt(c)]; });
  }

  function esc(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function fetchJ(url) {
    return fetch(url).then(function(r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }

  function animBar(el, pct) {
    setTimeout(function() { el.style.width = Math.min(100, Math.max(0, pct)) + '%'; }, 120);
  }

  function classOf(cls) {
    return CLASSES[cls] || { av: 'av-default', color: '#6b7280', icon: '?' };
  }

  function rarOf(r) {
    return RARITY[r] || RARITY['\u0634\u0627\u0626\u0639'];
  }

  function groupsPath() { return BASE + '/groups/'; }

  // مسار بيانات اللاعب: إذا في gid ياخذ من مجلد القروب، وإلا من users/
  function playerDataPath(jid, gid) {
    if (gid) return groupsPath() + enc(gid) + '/' + enc(normJid(jid)) + '.json';
    return BASE + '/users/' + enc(normJid(jid)) + '.json';
  }

  /* ============================================
     صفحة القروبات الرئيسية
     ============================================ */

  function initGroupsPage() {
    var grid = document.getElementById('groupsGrid');
    var countEl = document.getElementById('countDisplay');
    var search = document.getElementById('searchInput');
    var noRes = document.getElementById('noResults');
    var allGroups = [];

    fetchJ(groupsPath() + 'groups-index.json')
      .then(function(list) {
        return Promise.all(list.map(function(gid) {
          return fetchJ(groupsPath() + enc(gid) + '.json').catch(function(){ return null; });
        }));
      })
      .then(function(groups) {
        allGroups = groups.filter(Boolean);
        countEl.innerHTML = '<strong>' + arNum(allGroups.length) + '</strong> \u0642\u0631\u0648\u0628 \u0645\u0633\u062c\u0644';
        renderGroups(allGroups);
      })
      .catch(function() {
        countEl.innerHTML = '0 \u0642\u0631\u0648\u0628 \u0645\u0633\u062c\u0644';
        grid.innerHTML = '';
        grid.innerHTML = '<div class="empty-state"><div class="empty-icon">?</div><div class="empty-title">\u0644\u0627 \u064a\u0648\u062c\u062f \u0642\u0631\u0648\u0628\u0627\u062a</div></div>';
      });

    search.addEventListener('input', function() {
      var q = this.value.trim().toLowerCase();
      if (!q) { renderGroups(allGroups); noRes.style.display = 'none'; return; }
      var f = allGroups.filter(function(g) {
        return (g.name || '').toLowerCase().includes(q) || (g.id || '').toLowerCase().includes(q);
      });
      renderGroups(f);
      noRes.style.display = f.length === 0 ? 'block' : 'none';
    });
  }

  function renderGroups(groups) {
    var grid = document.getElementById('groupsGrid');
    grid.innerHTML = '';

    var colors = ['#8b5cf6','#3b82f6','#22c55e','#ec4899','#f97316','#eab308','#ef4444','#06b6d4'];

    groups.forEach(function(g, i) {
      var clr = colors[i % colors.length];
      var members = g.members || [];
      var msgs = g.messagesWeek || 0;
      var delay = 'd' + Math.min(i + 1, 6);

      // صور مصغرة للاعبين
      var previews = '';
      members.slice(0, 5).forEach(function(m) {
        var ci = classOf(m.class);
        previews += '<div class="mini-av" style="background:' + ci.color + '33; color:' + ci.color + ';">' + ci.icon + '</div>';
      });
      if (members.length > 5) {
        previews += '<div class="mini-av" style="background:var(--bg-glass-strong); color:var(--text-muted);">+' + (members.length - 5) + '</div>';
      }

      var html =
        '<a class="glass-card group-card anim ' + delay + '" href="group.html?gid=' + enc(g.id) + '">' +
          '<div class="card-accent" style="background:' + clr + ';"></div>' +
          '<div class="group-name"><span class="g-emoji">' + (g.emoji || '\uD83C\uDFD7') + '</span> ' + esc(g.name) + '</div>' +
          '<div class="group-stats">' +
            '<span class="g-stat"><span class="dot" style="background:var(--green);"></span> ' + arNum(members.length) + ' \u0644\u0627\u0639\u0628</span>' +
            '<span class="g-stat"><span class="dot" style="background:var(--blue);"></span> ' + arNum(msgs) + ' \u0631\u0633\u0627\u0644\u0629</span>' +
          '</div>' +
          '<div class="g-preview">' + previews + '</div>' +
        '</a>';

      grid.insertAdjacentHTML('beforeend', html);
    });
  }

  /* ============================================
     صفحة القروب الواحد
     ============================================ */

  function initGroupPage() {
    var gid = normJid(param('gid'));
    if (!gid) { showError('\u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u062f\u064a\u062f \u0642\u0631\u0648\u0628'); return; }

    var allPlayers = [];

    fetchJ(groupsPath() + enc(gid) + '.json')
      .then(function(group) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('siteFooter').style.display = 'block';
        document.title = group.name + ' - \u0641\u0627\u0637\u0645\u0629 \u0628\u0648\u062a';

        // هيدر القروب
        document.getElementById('groupAvatar').textContent = group.emoji || '\uD83C\uDFD7';
        document.getElementById('groupName').textContent = group.name;

        var members = group.members || [];
        var msgs = group.messagesWeek || 0;
        document.getElementById('groupBadges').innerHTML =
          '<span class="badge badge-class">' + arNum(members.length) + ' \u0644\u0627\u0639\u0628</span>' +
          '<span class="badge badge-level">' + arNum(msgs) + ' \u0631\u0633\u0627\u0644\u0629 \u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639</span>';

        document.getElementById('playerCount').innerHTML =
          '<strong>' + arNum(members.length) + '</strong> \u0644\u0627\u0639\u0628 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0642\u0631\u0648\u0628';

        // تحميل بيانات كل لاعب
        if (members.length === 0) {
          document.getElementById('noPlayers').style.display = 'block';
          return;
        }

        return Promise.all(members.map(function(m) {
          var pId = m.id || m;
          var playerUrl = playerDataPath(pId, gid);
            return fetchJ(playerUrl).catch(function() {
            return { id: pId, name: m.name || '\u0644\u0627\u0639\u0628', class: '' };
          });
        }));
      })
      .then(function(players) {
        if (!players) return;
        allPlayers = players.filter(Boolean);
        allPlayers.sort(function(a, b) { return (b.level || 0) - (a.level || 0); });
        renderGroupPlayers(allPlayers);
      })
      .catch(function() { showError('\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0642\u0631\u0648\u0628'); });

    // بحث داخل اللاعبين
    document.getElementById('playerSearch').addEventListener('input', function() {
      var q = this.value.trim().toLowerCase();
      if (!q) { renderGroupPlayers(allPlayers); return; }
      var f = allPlayers.filter(function(p) {
        return (p.name || '').toLowerCase().includes(q) || (p.class || '').includes(q);
      });
      renderGroupPlayers(f);
    });
  }

  function renderGroupPlayers(players) {
    var list = document.getElementById('playersList');
    var noP = document.getElementById('noPlayers');
    list.innerHTML = '';

    if (players.length === 0) { noP.style.display = 'block'; return; }
    noP.style.display = 'none';

    players.forEach(function(p, i) {
      var ci = classOf(p.class);
      var delay = 'd' + Math.min(i + 1, 6);
      var xpN = xpFor(p.level || 1);
      var xpP = xpN > 0 ? Math.min(100, ((p.xp || 0) / xpN) * 100) : 0;

      var html =
        '<a class="glass-card player-row anim ' + delay + '" href="profile.html?jid=' + enc(normJid(p.id)) + '&gid=' + enc(param('gid')) + '">' +
          '<div class="row-av ' + ci.av + '">' + ci.icon + '</div>' +
          '<div class="row-info">' +
            '<div class="row-name">' + esc(p.name || '\u0644\u0627\u0639\u0628') + '</div>' +
            '<div class="row-class">' + esc(p.evolvedClass || p.class || '\u0635\u0646\u0641 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641') + '</div>' +
          '</div>' +
          '<div class="row-lvl">\u0645\u0633\u062a\u0648\u0649 ' + (p.level || 1) + '</div>' +
        '</a>';

      list.insertAdjacentHTML('beforeend', html);
    });
  }

  /* ============================================
     صفحة الملف الشخصي
     ============================================ */

  function initProfilePage() {
    var jid = normJid(param('jid'));
    var fromGid = normJid(param('gid'));
    if (!jid) { showErr('\u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u062f\u064a\u062f \u0644\u0627\u0639\u0628'); return; }

    // محاولة جلب البيانات من مجلد القروب إذا في gid
    if (fromGid) {
      fetchJ(playerDataPath(jid, fromGid))
        .then(function(data) { renderProfile(data, fromGid, jid); })
        .catch(function() {
          // فشل - جرب نبحث في فهرس اللاعب عن أول قروب
          fallbackLoadProfile(jid);
        });
    } else {
      // ما في gid - نجيب فهرس اللاعب ونحاول أول قروب
      fallbackLoadProfile(jid);
    }
  }

  /**
   * نظام احتياطي: إذا ما في gid أو فشل التحميل
   * يجيب فهرس اللاعب ويحمل من أول قروب متوفر
   */
  function fallbackLoadProfile(jid) {
    fetchJ(BASE + '/players/' + enc(jid) + '.json')
      .then(function(idx) {
        var groups = idx.groups || [];
        if (groups.length > 0) {
          // نحاول أول قروب في القائمة
          return fetchJ(playerDataPath(jid, groups[0].id));
        }
        throw new Error('لا توجد قروبات');
      })
      .then(function(data) {
        var gid = data.groupId || '';
        renderProfile(data, gid, jid);
      })
      .catch(function() {
        showErr('\u062a\u0639\u0630\u0631 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0645\u0644\u0641 \u0627\u0644\u0644\u0627\u0639\u0628');
      });
  }

  function renderProfile(p, fromGid, rawJid) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('profileContent').style.display = 'block';
    document.getElementById('siteFooter').style.display = 'block';

    var ci = classOf(p.class);
    document.title = (p.name || '\u0644\u0627\u0639\u0628') + ' - \u0641\u0627\u0637\u0645\u0629 \u0628\u0648\u062a';

    // الأفاتار
    var av = document.getElementById('avatar');
    av.className = 'profile-avatar ' + ci.av;
    av.textContent = ci.icon;

    // الاسم
    document.getElementById('pName').textContent = p.name || '\u0644\u0627\u0639\u0628';

    // اللقب
    var nickEl = document.getElementById('pNick');
    if (p.nickname) { nickEl.textContent = '\u00AB ' + p.nickname + ' \u00BB'; nickEl.style.display = 'block'; }
    else { nickEl.style.display = 'none'; }

    // الشارات
    var dispClass = p.evolvedClass || p.class || '';
    var badges = '<span class="badge badge-class">' + ci.icon + ' ' + esc(dispClass) + '</span>';
    badges += '<span class="badge badge-level">\u0645\u0633\u062a\u0648\u0649 ' + (p.level || 1) + '</span>';
    if (p.evolvedClass) {
      badges += '<span class="badge badge-evo">\u2605 ' + esc(p.evolutionPath || '') + '</span>';
    }
    document.getElementById('pBadges').innerHTML = badges;

    // قروبات اللاعب - نجيبها من فهرس اللاعب (players/{jid}.json)
    var groupsEl = document.getElementById('pGroups');
    groupsEl.style.display = 'block';
    groupsEl.innerHTML = '<div class="pg-label">\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...</div>';

    fetchJ(BASE + '/players/' + enc(rawJid) + '.json')
      .then(function(idx) {
        var groups = idx.groups || [];
        if (groups.length > 0) {
          var html = '<div class="pg-label">\u0627\u0644\u0642\u0631\u0648\u0628\u0627\u062a (' + arNum(groups.length) + ')</div><div class="pg-list">';
          groups.forEach(function(g) {
            var isCurrent = fromGid && g.id === fromGid;
            html += '<a class="g-tag" href="profile.html?jid=' + enc(rawJid) + '&gid=' + enc(g.id) + '"' +
              (isCurrent ? ' style="border-color:var(--purple-bright); color:var(--purple-bright);"' : '') + '>' +
              (g.emoji || '') + ' ' + esc(g.name) + ' (\u0645' + (g.level || 1) + ')</a>';
          });
          html += '</div>';
          groupsEl.innerHTML = html;
        } else if (fromGid) {
          groupsEl.innerHTML =
            '<div class="pg-label">\u0627\u0644\u0642\u0631\u0648\u0628\u0627\u062a</div>' +
            '<div class="pg-list"><a class="g-tag" href="group.html?gid=' + enc(fromGid) + '">\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0642\u0631\u0648\u0628</a></div>';
        } else {
          groupsEl.style.display = 'none';
        }
      })
      .catch(function() {
        if (fromGid) {
          groupsEl.innerHTML =
            '<div class="pg-label">\u0627\u0644\u0642\u0631\u0648\u0628\u0627\u062a</div>' +
            '<div class="pg-list"><a class="g-tag" href="group.html?gid=' + enc(fromGid) + '">\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0642\u0631\u0648\u0628</a></div>';
        } else {
          groupsEl.style.display = 'none';
        }
      });

    // الخبرة
    var xpN = xpFor(p.level || 1);
    var xpP = xpN > 0 ? Math.min(100, ((p.xp || 0) / xpN) * 100) : 0;
    document.getElementById('xpVal').textContent = fmtNum(p.xp || 0) + ' / ' + fmtNum(xpN);
    animBar(document.getElementById('xpBar'), xpP);

    // الصحة
    var hpP = (p.maxHp || 0) > 0 ? Math.min(100, ((p.hp || 0) / p.maxHp) * 100) : 0;
    document.getElementById('hpVal').textContent = (p.hp || 0) + ' / ' + (p.maxHp || 0);
    animBar(document.getElementById('hpBar'), hpP);

    // القوة
    var stP = (p.maxStamina || 0) > 0 ? Math.min(100, ((p.stamina || 0) / p.maxStamina) * 100) : 0;
    document.getElementById('stamVal').textContent = (p.stamina || 0) + ' / ' + (p.maxStamina || 0);
    animBar(document.getElementById('stamBar'), stP);

    // الطاقة
    document.getElementById('nrgVal').textContent = p.energy || 0;
    animBar(document.getElementById('nrgBar'), Math.min(100, p.energy || 0));

    // القتال
    document.getElementById('sAtk').textContent = p.atk || 0;
    document.getElementById('sDef').textContent = p.def || 0;
    document.getElementById('sMag').textContent = p.mag || 0;
    document.getElementById('sCrit').textContent = ((p.critRate || 0.05) * 100).toFixed(1) + '%';
    document.getElementById('sCritD').textContent = ((p.critDamage || 1.5) * 100).toFixed(0) + '%';

    // الموارد
    document.getElementById('rGold').textContent = fmtNum(p.gold || 0);
    document.getElementById('rGems').textContent = fmtNum(p.gems || 0);
    document.getElementById('rElix').textContent = fmtNum(p.elixir || 0);

    // المعدات
    renderEquip(p);

    // المخزون
    renderInv(p);

    // الصناديق
    renderBoxes(p);

    // الإحصائيات
    renderStats(p);

    // القتال
    var total = (p.wins || 0) + (p.losses || 0);
    var wr = total > 0 ? Math.round(((p.wins || 0) / total) * 100) : 0;
    document.getElementById('bWins').textContent = arNum(p.wins || 0);
    document.getElementById('bLoss').textContent = arNum(p.losses || 0);
    document.getElementById('bRate').textContent = wr + '%';
    document.getElementById('wrVal').textContent = wr + '%';
    animBar(document.getElementById('wrBar'), wr);

    // المهارات
    renderSkills(p);

    // تفعيل التبويبات
    initTabs();
  }

  function renderEquip(p) {
    var slots = document.getElementById('equipSlots');
    var noEq = document.getElementById('noEquip');
    var html = '';

    var hasW = p.equippedWeapon && p.equippedWeapon.name;
    var hasA = p.equippedArmor;

    if (!hasW && !hasA) { noEq.style.display = 'block'; slots.innerHTML = ''; return; }
    noEq.style.display = 'none';

    if (hasW) {
      var wr = rarOf(p.equippedWeapon.rarity);
      html +=
        '<div class="equip-slot rb-' + wr.cls + '">' +
          '<div class="eq-icon" style="background:' + wr.color + '22; color:' + wr.color + ';">&#9876;</div>' +
          '<div class="eq-info">' +
            '<div class="eq-name" style="color:' + wr.color + ';">' + esc(p.equippedWeapon.name) + '</div>' +
            '<div class="eq-meta">\u0633\u0644\u0627\u062d \u2502 ' + wr.color + ' \u2502 \u0645\u0633\u062a\u0648\u0649 ' + (p.equippedWeapon.level || 1) + '</div>' +
          '</div>' +
          '<div class="eq-stat" style="color:var(--red);">+' + (p.equippedWeapon.atk || 0) + '</div>' +
        '</div>';
    }

    // الدروع (could be object with slots or single armor)
    if (hasA) {
      if (typeof hasA === 'object' && hasA.name) {
        // Single armor object
        var ar = rarOf(hasA.rarity);
        html +=
          '<div class="equip-slot rb-' + ar.cls + '">' +
            '<div class="eq-icon" style="background:' + ar.color + '22; color:' + ar.color + ';">&#9876;</div>' +
            '<div class="eq-info">' +
              '<div class="eq-name" style="color:' + ar.color + ';">' + esc(hasA.name) + '</div>' +
              '<div class="eq-meta">\u062f\u0631\u0639 \u2502 \u0645\u0633\u062a\u0648\u0649 ' + (hasA.level || 1) + '</div>' +
            '</div>' +
            '<div class="eq-stat" style="color:var(--cyan);">+' + (hasA.def || 0) + '</div>' +
          '</div>';
      } else if (typeof hasA === 'object') {
        // Multiple armor slots
        var slotNames = {
          '\u062e\u0648\u0630\u0629': '\uD83E\uDDE8',
          '\u062f\u0631\u0639 \u0635\u062f\u0631': '\uD83D\uDEE1',
          '\u0642\u0641\u0627\u0632\u0627\u062a': '\uD83E\uDDE4',
          '\u062d\u0630\u0627\u0621': '\uD83D\uDC5F'
        };
        for (var slot in hasA) {
          if (hasA[slot] && hasA[slot].name) {
            var armor = hasA[slot];
            var ar2 = rarOf(armor.rarity);
            html +=
              '<div class="equip-slot rb-' + ar2.cls + '">' +
                '<div class="eq-icon" style="background:' + ar2.color + '22; color:' + ar2.color + ';">' + (slotNames[slot] || '&#9876;') + '</div>' +
                '<div class="eq-info">' +
                  '<div class="eq-name" style="color:' + ar2.color + ';">' + esc(armor.name) + '</div>' +
                  '<div class="eq-meta">' + esc(slot) + ' \u2502 \u0645\u0633\u062a\u0648\u0649 ' + (armor.level || 1) + '</div>' +
                '</div>' +
                '<div class="eq-stat" style="color:var(--cyan);">+' + (armor.def || 0) + '</div>' +
              '</div>';
          }
        }
      }
    }

    slots.innerHTML = html;
  }

  function renderInv(p) {
    var wList = document.getElementById('weaponsList');
    var aList = document.getElementById('armorsList');
    var div = document.getElementById('invDiv');
    var empty = document.getElementById('emptyInv');

    var hasW = p.weapons && p.weapons.length > 0;
    var hasA = p.armors && p.armors.length > 0;

    if (!hasW && !hasA) { empty.style.display = 'block'; wList.innerHTML = ''; aList.innerHTML = ''; div.style.display = 'none'; return; }
    empty.style.display = 'none';

    var wh = '';
    if (hasW) {
      wh += '<div class="sk-label">\u0627\u0644\u0623\u0633\u0644\u062d\u0629 (' + p.weapons.length + ')</div>';
      p.weapons.forEach(function(w) {
        var r = rarOf(w.rarity);
        var eq = p.equippedWeapon && p.equippedWeapon.name === w.name ? ' \u2713' : '';
        wh +=
          '<div class="inv-item">' +
            '<div class="inv-dot" style="background:' + r.color + ';"></div>' +
            '<div class="inv-name" style="color:' + r.color + ';">' + esc(w.name) + eq + '</div>' +
            '<div class="inv-stat" style="color:var(--red);">+' + (w.atk || 0) + '</div>' +
            '<div class="inv-lvl">\u0645\u0633' + (w.level || 1) + '</div>' +
          '</div>';
      });
    }
    wList.innerHTML = wh;

    if (hasW && hasA) div.style.display = 'flex';
    else div.style.display = 'none';

    var ah = '';
    if (hasA) {
      ah += '<div class="sk-label">\u0627\u0644\u062f\u0631\u0648\u0639 (' + p.armors.length + ')</div>';
      p.armors.forEach(function(a) {
        var r = rarOf(a.rarity);
        ah +=
          '<div class="inv-item">' +
            '<div class="inv-dot" style="background:' + r.color + ';"></div>' +
            '<div class="inv-name" style="color:' + r.color + ';">' + esc(a.name) + '</div>' +
            '<div class="inv-stat" style="color:var(--cyan);">+' + (a.def || 0) + '</div>' +
            '<div class="inv-lvl">\u0645\u0633' + (a.level || 1) + '</div>' +
          '</div>';
      });
    }
    aList.innerHTML = ah;
  }

  function renderBoxes(p) {
    var grid = document.getElementById('boxesGrid');
    var boxes = p.boxes || {};
    var data = [
      { k: 'common', l: '\u0634\u0627\u0626\u0639', c: '#9ca3af', i: '\u25A1' },
      { k: 'rare', l: '\u0646\u0627\u062f\u0631', c: '#3b82f6', i: '\u25A2' },
      { k: 'epic', l: '\u0645\u0644\u062d\u0645\u064a', c: '#a855f7', i: '\u25A3' },
      { k: 'legendary', l: '\u0623\u0633\u0637\u0648\u0631\u064a', c: '#eab308', i: '\u2605' }
    ];
    var html = '';
    data.forEach(function(b) {
      html +=
        '<div class="bx-item"><div class="bx-icon" style="color:' + b.c + ';">' + b.i + '</div>' +
        '<div class="bx-cnt" style="color:' + b.c + ';">' + (boxes[b.k] || 0) + '</div>' +
        '<div class="bx-lbl">' + b.l + '</div></div>';
    });
    grid.innerHTML = html;
  }

  function renderStats(p) {
    var grid = document.getElementById('statsGrid');
    var s = p.stats || {};
    var items = [
      { v: s.monstersKilled || 0, l: '\u0648\u062d\u0648\u0634 \u0645\u0642\u062a\u0648\u0644\u0629' },
      { v: s.bossesDefeated || 0, l: '\u0632\u0639\u0645\u0627\u0621 \u0645\u0647\u0632\u0648\u0645\u0648\u0646' },
      { v: s.fishCaught || 0, l: '\u0623\u0633\u0645\u0627\u0643 \u0645\u0635\u0637\u0627\u062f\u0629' },
      { v: s.mineralsMined || 0, l: '\u0645\u0639\u0627\u062f\u0646 \u0645\u0633\u062a\u062e\u0631\u062c\u0629' },
      { v: s.pvpWins || 0, l: '\u0627\u0646\u062a\u0635\u0627\u0631\u0627\u062a' },
      { v: s.pvpLosses || 0, l: '\u0647\u0632\u0627\u0626\u0645' },
      { v: s.weaponsUpgraded || 0, l: '\u0623\u0633\u0644\u062d\u0629 \u0645\u0637\u0648\u0631\u0629' },
      { v: s.boxesOpened || 0, l: '\u0635\u0646\u0627\u062f\u064a\u0642 \u0645\u0641\u062a\u0648\u062d\u0629' }
    ];
    var html = '';
    items.forEach(function(it) {
      html += '<div class="s-box"><div class="s-val">' + arNum(it.v) + '</div><div class="s-lbl">' + it.l + '</div></div>';
    });
    grid.innerHTML = html;
  }

  function renderSkills(p) {
    var el = document.getElementById('skillsContent');
    var passive = (p.unlockedSkills && p.unlockedSkills.passive) || [];
    var active = (p.unlockedSkills && p.unlockedSkills.active) || [];

    if (p.skills) {
      p.skills.forEach(function(sk) {
        var t = sk.type || 'active';
        if (t === 'active' && active.indexOf(sk.name) === -1) active.push(sk.name);
        else if (t === 'passive' && passive.indexOf(sk.name) === -1) passive.push(sk.name);
      });
    }

    if (passive.length === 0 && active.length === 0) return;

    var html = '';
    if (active.length > 0) {
      html += '<div class="sk-label">\u0645\u0647\u0627\u0631\u0627\u062a \u0646\u0634\u0637\u0629 (' + active.length + ')</div>';
      active.forEach(function(s) {
        html += '<span class="sk-tag active"><span class="inv-dot" style="background:var(--purple); width:5px; height:5px;"></span> ' + esc(s) + '</span>';
      });
    }
    if (passive.length > 0) {
      html += '<div class="sk-label">\u0645\u0647\u0627\u0631\u0627\u062a \u0633\u0644\u0628\u064a\u0629 (' + passive.length + ')</div>';
      passive.forEach(function(s) {
        html += '<span class="sk-tag passive"><span class="inv-dot" style="background:var(--cyan); width:5px; height:5px;"></span> ' + esc(s) + '</span>';
      });
    }
    el.innerHTML = html;
  }

  function initTabs() {
    var btns = document.querySelectorAll('.tab-btn');
    btns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        btns.forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
        this.classList.add('active');
        var panel = document.getElementById('tab-' + this.getAttribute('data-tab'));
        if (panel) panel.classList.add('active');
      });
    });
  }

  function showError(msg) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorMsg').textContent = msg;
  }
  function showErr(msg) { showError(msg); }

  function enc(s) { return encodeURIComponent(s); }

  return {
    initGroupsPage: initGroupsPage,
    initGroupPage: initGroupPage,
    initProfilePage: initProfilePage
  };

})();
