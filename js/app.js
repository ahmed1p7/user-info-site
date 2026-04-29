/* ============================================
   FATIMA BOT - RPG Profile Viewer
   Main Application Logic
   ============================================ */

var FatimaApp = (function () {
  'use strict';

  var BASE_URL = '/user-info-site';
  var USERS_DIR = '/users/';

  var CLASS_MAP = {
    '\u0645\u062d\u0627\u0631\u0628': { avatarClass: 'avatar-warrior', color: '#ef4444' },
    '\u0633\u0627\u062d\u0631': { avatarClass: 'avatar-mage', color: '#8b5cf6' },
    '\u0631\u0627\u0645\u064a': { avatarClass: 'avatar-archer', color: '#22c55e' },
    '\u0634\u0627\u0641\u064a': { avatarClass: 'avatar-healer', color: '#ec4899' },
    '\u0642\u0627\u062a\u0644': { avatarClass: 'avatar-assassin', color: '#f97316' },
    '\u0641\u0627\u0631\u0633': { avatarClass: 'avatar-knight', color: '#3b82f6' }
  };

  var CLASS_ICONS = {
    '\u0645\u062d\u0627\u0631\u0628': '\u2694',
    '\u0633\u0627\u062d\u0631': '\u2728',
    '\u0631\u0627\u0645\u064a': '\u27B6',
    '\u0634\u0627\u0641\u064a': '\u2665',
    '\u0642\u0627\u062a\u0644': '\u2020',
    '\u0641\u0627\u0631\u0633': '\u26E8'
  };

  var RARITY_MAP = {
    '\u0634\u0627\u0626\u0639': { cssClass: 'common', color: '#9ca3af' },
    '\u0646\u0627\u062f\u0631': { cssClass: 'rare', color: '#3b82f6' },
    '\u0645\u0644\u062d\u0645\u064a': { cssClass: 'epic', color: '#a855f7' },
    '\u0623\u0633\u0637\u0648\u0631\u064a': { cssClass: 'legendary', color: '#eab308' }
  };

  function getXpForLevel(level) {
    return Math.floor(100 * Math.pow(1.25, level - 1));
  }

  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString('ar-SA');
  }

  function getRarityClass(rarity) {
    var r = RARITY_MAP[rarity];
    return r ? r.cssClass : 'common';
  }

  function getRarityColor(rarity) {
    var r = RARITY_MAP[rarity];
    return r ? r.color : '#9ca3af';
  }

  function getClassInfo(className) {
    var info = CLASS_MAP[className];
    if (!info) {
      return { avatarClass: 'avatar-warrior', color: '#8b5cf6' };
    }
    return info;
  }

  function getClassIcon(className) {
    return CLASS_ICONS[className] || '?';
  }

  function encodeJid(jid) {
    return encodeURIComponent(jid);
  }

  function getParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  // Normalize JID: convert @lid to @s.whatsapp.net for backwards compatibility
  function normalizeJid(jid) {
    if (!jid) return jid;
    return jid.replace(/@lid$/, '@s.whatsapp.net');
  }

  function fetchJSON(url) {
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      });
  }

  function animateBar(fillEl, percent) {
    percent = Math.min(100, Math.max(0, percent));
    setTimeout(function () {
      fillEl.style.width = percent + '%';
    }, 100);
  }

  function numeralArabic(n) {
    var digits = ['\u0660', '\u0661', '\u0662', '\u0663', '\u0664', '\u0665', '\u0666', '\u0667', '\u0668', '\u0669'];
    return String(n).replace(/[0-9]/g, function (d) { return digits[parseInt(d)]; });
  }

  // =============================================
  //  INDEX PAGE
  // =============================================

  function initIndexPage() {
    var grid = document.getElementById('playersGrid');
    var countEl = document.getElementById('playerCount');
    var searchInput = document.getElementById('searchInput');
    var noResults = document.getElementById('noResults');
    var allPlayers = [];

    fetchJSON(BASE_URL + USERS_DIR + 'players-index.json')
      .then(function (jidList) {
        countEl.innerHTML = '<span style="color:var(--purple-bright); font-weight:700;">' +
          numeralArabic(jidList.length) + '</span> \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646 \u0627\u0644\u0645\u0633\u062c\u0644\u0648\u0646';
        return Promise.all(
          jidList.map(function (jid) {
            return fetchJSON(BASE_URL + USERS_DIR + encodeJid(jid) + '.json')
              .catch(function () { return null; });
          })
        );
      })
      .then(function (players) {
        allPlayers = players.filter(function (p) { return p !== null; });
        renderPlayers(allPlayers);
      })
      .catch(function () {
        countEl.textContent = '0 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646 \u0627\u0644\u0645\u0633\u062c\u0644\u0648\u0646';
        grid.innerHTML = '';
        grid.innerHTML =
          '<div class="empty-state">' +
            '<div class="empty-icon">~</div>' +
            '<div class="empty-title">\u0644\u0627 \u064a\u0648\u062c\u062f \u0644\u0627\u0639\u0628\u0648\u0646 \u062d\u0627\u0644\u064a\u0627</div>' +
            '<div class="empty-message">\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0644\u0627\u0639\u0628\u064a\u0646</div>' +
          '</div>';
      });

    searchInput.addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      if (!q) {
        renderPlayers(allPlayers);
        noResults.style.display = 'none';
        return;
      }
      var filtered = allPlayers.filter(function (p) {
        return (
          p.name.toLowerCase().includes(q) ||
          (p.nickname && p.nickname.toLowerCase().includes(q)) ||
          (p.class && p.class.includes(q))
        );
      });
      renderPlayers(filtered);
      noResults.style.display = filtered.length === 0 ? 'block' : 'none';
    });
  }

  function renderPlayers(players) {
    var grid = document.getElementById('playersGrid');
    grid.innerHTML = '';

    if (players.length === 0) return;

    players.forEach(function (p, i) {
      var classInfo = getClassInfo(p.class);
      var classIcon = getClassIcon(p.class);
      var xpNeeded = getXpForLevel(p.level);
      var xpPercent = xpNeeded > 0 ? Math.min(100, (p.xp / xpNeeded) * 100) : 0;
      var delayClass = 'delay-' + Math.min(i + 1, 6);

      var cardHTML =
        '<a class="player-card glass-card animate-fade-in-up ' + delayClass + '" href="profile.html?jid=' + encodeJid(p.id) + '">' +
          '<div class="card-class-stripe" style="background:' + classInfo.color + ';"></div>' +
          '<div class="card-inner">' +
            '<div class="card-top">' +
              '<div class="class-avatar ' + classInfo.avatarClass + '">' +
                '<span style="font-size:22px;">' + classIcon + '</span>' +
              '</div>' +
              '<div class="player-info">' +
                '<div class="player-name">' + escapeHtml(p.name) + '</div>' +
                '<div class="player-class-label">' + escapeHtml(p.evolvedClass || p.class) + '</div>' +
              '</div>' +
              '<div class="player-level-badge">Lv. ' + p.level + '</div>' +
            '</div>' +
            '<div class="xp-bar-container">' +
              '<div class="progress-bar">' +
                '<div class="progress-bar-fill" id="xp-fill-' + i + '"></div>' +
              '</div>' +
            '</div>' +
            '<div class="card-stats-row">' +
              '<span><span class="stat-icon" style="color:#ef4444;">\u2694</span> ' + p.atk + '</span>' +
              '<span><span class="stat-icon" style="color:#22d3ee;">\u26E8</span> ' + p.def + '</span>' +
              '<span><span class="stat-icon" style="color:#22c55e;">\u2713</span> ' + p.wins + 'W</span>' +
              '<span><span class="stat-icon" style="color:#ef4444;">\u2717</span> ' + p.losses + 'L</span>' +
            '</div>' +
          '</div>' +
        '</a>';

      grid.insertAdjacentHTML('beforeend', cardHTML);

      setTimeout(function () {
        var fillEl = document.getElementById('xp-fill-' + i);
        if (fillEl) animateBar(fillEl, xpPercent);
      }, 200 + i * 80);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // =============================================
  //  PROFILE PAGE
  // =============================================

  function initProfilePage() {
    var jid = normalizeJid(getParam('jid'));
    if (!jid) {
      showError('\u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u062f\u064a\u062f \u0644\u0627\u0639\u0628', '\u0627\u0644\u0631\u062c\u0627\u0621 \u0625\u062f\u062e\u0627\u0644 \u0645\u0639\u0631\u0641 \u0627\u0644\u0644\u0627\u0639\u0628 \u0641\u064a \u0627\u0644\u0631\u0627\u0628\u0637.');
      return;
    }

    fetchJSON(BASE_URL + USERS_DIR + encodeJid(jid) + '.json')
      .then(function (data) {
        renderProfile(data);
      })
      .catch(function () {
        showError('\u0641\u0634\u0644 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a', '\u062a\u0639\u0630\u0631 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0645\u0644\u0641 \u0627\u0644\u0644\u0627\u0639\u0628 \u0627\u0644\u0645\u0637\u0644\u0648\u0628.');
      });
  }

  function showError(title, message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
  }

  function renderProfile(p) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('profileContent').style.display = 'block';
    document.getElementById('siteFooter').style.display = 'block';

    var classInfo = getClassInfo(p.class);
    var classIcon = getClassIcon(p.class);
    var displayClass = p.evolvedClass || p.class;

    document.title = p.name + ' - FATIMA BOT';

    // Header
    var avatar = document.getElementById('profileAvatar');
    avatar.className = 'profile-avatar-large ' + classInfo.avatarClass;
    document.getElementById('avatarIcon').innerHTML = '<span style="font-size:40px;">' + classIcon + '</span>';

    document.getElementById('profileName').textContent = p.name;

    if (p.nickname) {
      var nickEl = document.getElementById('profileNickname');
      nickEl.textContent = '\u00AB ' + p.nickname + ' \u00BB';
      nickEl.style.display = 'block';
    } else {
      document.getElementById('profileNickname').style.display = 'none';
    }

    var classBadge = document.getElementById('profileClassBadge');
    classBadge.style.borderColor = classInfo.color + '55';
    classBadge.style.background = classInfo.color + '15';
    classBadge.style.color = classInfo.color;
    document.getElementById('classIcon').textContent = classIcon;
    document.getElementById('className').textContent = displayClass;

    if (p.evolvedClass) {
      document.getElementById('evolutionBadge').innerHTML =
        '<div class="evolution-badge">\u2605 ' + escapeHtml(p.evolutionPath) + '</div>';
    }

    document.getElementById('profileLevel').textContent = p.level;

    if (p.clanId) {
      document.getElementById('clanBadge').innerHTML =
        '<div class="clan-badge">\u2694 ' + escapeHtml(p.clanRole || '\u0639\u0636\u0648') + '</div>';
    }

    // XP
    var xpNeeded = getXpForLevel(p.level);
    var xpPercent = xpNeeded > 0 ? Math.min(100, (p.xp / xpNeeded) * 100) : 0;
    document.getElementById('xpValue').textContent = formatNumber(p.xp) + ' / ' + formatNumber(xpNeeded);
    animateBar(document.getElementById('xpBarFill'), xpPercent);

    // HP
    var hpPercent = p.maxHp > 0 ? Math.min(100, (p.hp / p.maxHp) * 100) : 0;
    document.getElementById('hpValue').textContent = p.hp + ' / ' + p.maxHp;
    animateBar(document.getElementById('hpBarFill'), hpPercent);

    // Stamina
    var staminaPercent = p.maxStamina > 0 ? Math.min(100, (p.stamina / p.maxStamina) * 100) : 0;
    document.getElementById('staminaValue').textContent = p.stamina + ' / ' + p.maxStamina;
    animateBar(document.getElementById('staminaBarFill'), staminaPercent);

    // Energy
    document.getElementById('energyValue').textContent = p.energy;
    animateBar(document.getElementById('energyBarFill'), p.energy);

    // Combat Stats
    document.getElementById('statAtk').textContent = p.atk;
    document.getElementById('statDef').textContent = p.def;
    document.getElementById('statMag').textContent = p.mag;
    document.getElementById('statCritRate').textContent = (p.critRate * 100).toFixed(1) + '%';
    document.getElementById('statCritDmg').textContent = (p.critDamage * 100).toFixed(0) + '%';

    // Resources
    document.getElementById('resGold').textContent = formatNumber(p.gold);
    document.getElementById('resGems').textContent = formatNumber(p.gems);
    document.getElementById('resElixir').textContent = formatNumber(p.elixir);

    renderEquipment(p);
    renderInventory(p);
    renderBoxes(p);
    initTabs();

    // Battle Record
    var total = p.wins + p.losses;
    var winRate = total > 0 ? Math.round((p.wins / total) * 100) : 0;
    document.getElementById('battleWins').textContent = p.wins;
    document.getElementById('battleLosses').textContent = p.losses;
    document.getElementById('battleRate').textContent = winRate + '%';
    document.getElementById('winrateValue').textContent = winRate + '%';
    animateBar(document.getElementById('winrateBarFill'), winRate);

    renderStats(p);
    renderSkills(p);
  }

  function renderEquipment(p) {
    var weaponSlot = document.getElementById('equippedWeaponSlot');
    var armorSlot = document.getElementById('equippedArmorSlot');
    var noEquip = document.getElementById('noEquipment');

    var hasWeapon = p.equippedWeapon && p.equippedWeapon.name;
    var hasArmor = p.equippedArmor && p.equippedArmor.name;

    if (!hasWeapon && !hasArmor) {
      noEquip.style.display = 'block';
      return;
    }

    if (hasWeapon) {
      var wRarity = p.equippedWeapon.rarity || '\u0634\u0627\u0626\u0639';
      var wRClass = getRarityClass(wRarity);
      var wRColor = getRarityColor(wRarity);
      weaponSlot.innerHTML =
        '<div class="equipment-slot rarity-' + wRClass + '">' +
          '<div class="equip-icon" style="background:' + wRColor + '22; color:' + wRColor + ';">\u2694</div>' +
          '<div class="equip-details">' +
            '<div class="equip-name" style="color:' + wRColor + ';">' + escapeHtml(p.equippedWeapon.name) + '</div>' +
            '<div class="equip-meta">\u0627\u0644\u0633\u0644\u0627\u062d \u2502 ' + wRarity + ' \u2502 Lv.' + (p.equippedWeapon.level || 1) + '</div>' +
          '</div>' +
          '<div class="equip-stat" style="color:#ef4444;">+' + p.equippedWeapon.atk + ' ATK</div>' +
        '</div>';
    }

    if (hasArmor) {
      var aRarity = p.equippedArmor.rarity || '\u0634\u0627\u0626\u0639';
      var aRClass = getRarityClass(aRarity);
      var aRColor = getRarityColor(aRarity);
      armorSlot.innerHTML =
        '<div class="equipment-slot rarity-' + aRClass + '">' +
          '<div class="equip-icon" style="background:' + aRColor + '22; color:' + aRColor + ';">\u26E8</div>' +
          '<div class="equip-details">' +
            '<div class="equip-name" style="color:' + aRColor + ';">' + escapeHtml(p.equippedArmor.name) + '</div>' +
            '<div class="equip-meta">\u0627\u0644\u062f\u0631\u0639 \u2502 ' + aRarity + ' \u2502 Lv.' + (p.equippedArmor.level || 1) + '</div>' +
          '</div>' +
          '<div class="equip-stat" style="color:#22d3ee;">+' + p.equippedArmor.def + ' DEF</div>' +
        '</div>';
    }
  }

  function renderInventory(p) {
    var weaponsList = document.getElementById('weaponsList');
    var armorsList = document.getElementById('armorsList');
    var divider = document.getElementById('inventoryDivider');
    var emptyEl = document.getElementById('emptyInventory');

    var hasWeapons = p.weapons && p.weapons.length > 0;
    var hasArmors = p.armors && p.armors.length > 0;

    if (!hasWeapons && !hasArmors) {
      emptyEl.style.display = 'block';
      return;
    }

    var weaponsHtml = '';

    if (hasWeapons) {
      weaponsHtml += '<div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">\u0627\u0644\u0623\u0633\u0644\u062d\u0629 (' + p.weapons.length + ')</div>';
      p.weapons.forEach(function (w) {
        var rClass = getRarityClass(w.rarity || '\u0634\u0627\u0626\u0639');
        var rColor = getRarityColor(w.rarity || '\u0634\u0627\u0626\u0639');
        var isEquipped = p.equippedWeapon && p.equippedWeapon.name === w.name;
        weaponsHtml +=
          '<div class="inventory-item rarity-' + rClass + '">' +
            '<div class="item-dot ' + rClass + '"></div>' +
            '<div class="item-name" style="color:' + rColor + ';">' +
              escapeHtml(w.name) + (isEquipped ? ' \u2713' : '') +
            '</div>' +
            '<div style="font-size:0.75rem; color:#ef4444; flex-shrink:0;">+' + w.atk + '</div>' +
            '<div class="item-level">Lv.' + (w.level || 1) + '</div>' +
          '</div>';
      });
    }

    weaponsList.innerHTML = weaponsHtml;

    if (hasWeapons && hasArmors) {
      divider.style.display = 'flex';
    }

    var armorsHtml = '';

    if (hasArmors) {
      armorsHtml += '<div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">\u0627\u0644\u062f\u0631\u0648\u0639 (' + p.armors.length + ')</div>';
      p.armors.forEach(function (a) {
        var rClass = getRarityClass(a.rarity || '\u0634\u0627\u0626\u0639');
        var rColor = getRarityColor(a.rarity || '\u0634\u0627\u0626\u0639');
        var isEquipped = p.equippedArmor && p.equippedArmor.name === a.name;
        armorsHtml +=
          '<div class="inventory-item rarity-' + rClass + '">' +
            '<div class="item-dot ' + rClass + '"></div>' +
            '<div class="item-name" style="color:' + rColor + ';">' +
              escapeHtml(a.name) + (isEquipped ? ' \u2713' : '') +
            '</div>' +
            '<div style="font-size:0.75rem; color:#22d3ee; flex-shrink:0;">+' + a.def + '</div>' +
            '<div class="item-level">Lv.' + (a.level || 1) + '</div>' +
          '</div>';
      });
    }

    armorsList.innerHTML = armorsHtml;
  }

  function renderBoxes(p) {
    var boxesGrid = document.getElementById('boxesGrid');
    var boxes = p.boxes || {};

    var boxData = [
      { key: 'common', label: '\u0634\u0627\u0626\u0639', color: '#9ca3af', icon: '\u25A1' },
      { key: 'rare', label: '\u0646\u0627\u062f\u0631', color: '#3b82f6', icon: '\u25A2' },
      { key: 'epic', label: '\u0645\u0644\u062d\u0645\u064a', color: '#a855f7', icon: '\u25A3' },
      { key: 'legendary', label: '\u0623\u0633\u0637\u0648\u0631\u064a', color: '#eab308', icon: '\u2605' }
    ];

    var html = '';
    boxData.forEach(function (b) {
      var count = boxes[b.key] || 0;
      html +=
        '<div class="box-item">' +
          '<span class="box-icon" style="color:' + b.color + ';">' + b.icon + '</span>' +
          '<div class="box-count" style="color:' + b.color + ';">' + count + '</div>' +
          '<div class="box-label">' + b.label + '</div>' +
        '</div>';
    });

    boxesGrid.innerHTML = html;
  }

  function renderStats(p) {
    var statsGrid = document.getElementById('statsGrid');
    var s = p.stats || {};

    var statItems = [
      { icon: '\u2620', label: '\u0648\u062d\u0648\u0634 \u0645\u0642\u062a\u0648\u0644\u0629', value: s.monstersKilled || 0 },
      { icon: '\u265B', label: '\u0632\u0639\u0645\u0627\u0621 \u0645\u0647\u0632\u0648\u0645\u0648\u0646', value: s.bossesDefeated || 0 },
      { icon: '\u263D', label: '\u0623\u0633\u0645\u0627\u0643 \u0645\u0635\u0637\u0627\u062f\u0629', value: s.fishCaught || 0 },
      { icon: '\u26CF', label: '\u0645\u0639\u0627\u062f\u0646 \u0645\u0633\u062a\u062e\u0631\u062c\u0629', value: s.mineralsMined || 0 },
      { icon: '\u2694', label: '\u0627\u0646\u062a\u0635\u0627\u0631\u0627\u062a PVP', value: s.pvpWins || 0 },
      { icon: '\u2716', label: '\u0647\u0632\u0627\u0626\u0645 PVP', value: s.pvpLosses || 0 },
      { icon: '\u2191', label: '\u0623\u0633\u0644\u062d\u0629 \u0645\u0637\u0648\u0631\u0629', value: s.weaponsUpgraded || 0 },
      { icon: '\u2756', label: '\u0635\u0646\u0627\u062f\u064a\u0642 \u0645\u0641\u062a\u0648\u062d\u0629', value: s.boxesOpened || 0 }
    ];

    var html = '';
    statItems.forEach(function (item) {
      html +=
        '<div class="stat-mini">' +
          '<div class="stat-mini-icon">' + item.icon + '</div>' +
          '<div>' +
            '<div class="stat-mini-value">' + item.value + '</div>' +
            '<div class="stat-mini-label">' + item.label + '</div>' +
          '</div>' +
        '</div>';
    });

    statsGrid.innerHTML = html;
  }

  function renderSkills(p) {
    var content = document.getElementById('skillsContent');

    var passiveSkills = (p.unlockedSkills && p.unlockedSkills.passive) || [];
    var activeSkills = (p.unlockedSkills && p.unlockedSkills.active) || [];

    if (p.skills && p.skills.length > 0) {
      p.skills.forEach(function (sk) {
        var type = sk.type || 'active';
        if (type === 'active' && activeSkills.indexOf(sk.name) === -1) {
          activeSkills.push(sk.name);
        } else if (type === 'passive' && passiveSkills.indexOf(sk.name) === -1) {
          passiveSkills.push(sk.name);
        }
      });
    }

    if (passiveSkills.length === 0 && activeSkills.length === 0) {
      content.innerHTML = '<div class="skills-empty">\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0647\u0627\u0631\u0627\u062a \u0645\u0641\u062a\u0648\u062d\u0629 \u062d\u0627\u0644\u064a\u0627</div>';
      return;
    }

    var html = '';

    if (activeSkills.length > 0) {
      html += '<div class="skills-category">';
      html += '<div class="skills-category-title"><span style="color:var(--purple-bright);">\u26A1</span> \u0645\u0647\u0627\u0631\u0627\u062a \u0646\u0634\u0637\u0629 (' + activeSkills.length + ')</div>';
      activeSkills.forEach(function (sk) {
        html += '<span class="skill-tag active"><span class="skill-type-dot"></span>' + escapeHtml(sk) + '</span>';
      });
      html += '</div>';
    }

    if (passiveSkills.length > 0) {
      html += '<div class="skills-category">';
      html += '<div class="skills-category-title"><span style="color:var(--cyan);">\u2736</span> \u0645\u0647\u0627\u0631\u0627\u062a \u0633\u0644\u0628\u064a\u0629 (' + passiveSkills.length + ')</div>';
      passiveSkills.forEach(function (sk) {
        html += '<span class="skill-tag passive"><span class="skill-type-dot"></span>' + escapeHtml(sk) + '</span>';
      });
      html += '</div>';
    }

    content.innerHTML = html;
  }

  function initTabs() {
    var tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabBtns.forEach(function (b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });

        this.classList.add('active');
        var tabId = 'tab-' + this.getAttribute('data-tab');
        var tabContent = document.getElementById(tabId);
        if (tabContent) tabContent.classList.add('active');
      });
    });
  }

  return {
    initIndexPage: initIndexPage,
    initProfilePage: initProfilePage
  };

})();