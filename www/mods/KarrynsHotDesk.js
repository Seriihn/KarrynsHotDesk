// #MODS TXT LINES:
// {"name":"KarrynsHotDesk","status":true,"description":"Adds Receptionist actions: Charm Goblin (Pussy/Anal/Cunni) and Strip Down.","parameters":{"name":"KarrynsHotDesk","displayedName":"Karryn's Hot Desk","version":"1.4.1"}}
// #MODS TXT LINES END

var KarrynsHotDesk = KarrynsHotDesk || {};

(function() {
    'use strict';

    var MOD_NAME = "Karryn's Hot Desk";
    var CHARM_GOBLIN_PUSSY_SKILL_ID = 9200;
    var CHARM_GOBLIN_ANAL_SKILL_ID = 9201;
    var CHARM_GOBLIN_CUNNI_SKILL_ID = 9202;
    var STRIP_DOWN_SKILL_ID = 9203;
    var RECEPTIONIST_KICK_AWAY_SKILL_ID = 1596;
    var RECEPTIONIST_FIX_CLOTHES_SKILL_ID = 1597;
    var RECEPTIONIST_KICK_AWAY_LINE_ID = 7132;
    var DEBUG_LOG = false;

    var CHARM_ACTION_NAME = 'Charm Goblin';
    var CHARM_ACTION_NAME_PUSSY = 'Charm Goblin (Pussy)';
    var CHARM_ACTION_NAME_ANAL = 'Charm Goblin (Anal)';
    var CHARM_ACTION_NAME_CUNNI = 'Charm Goblin (Cunni)';
    var CHARM_ACTION_DESC = 'Target a goblin behind Karryn and instantly start receptionist sex.';
    var STRIP_ACTION_NAME = 'Strip Down';
    var STRIP_ACTION_DESC = "Instantly remove all of Karryn's clothes and panties.";
    var STRIP_LOG_REPLACEMENT = "Karryn hurriedly removes her skirt and panties.";
    var pendingKickLogReplacementLines = 0;
    var pendingStripLogReplacementLines = 0;
    var CHARM_LOG_REPLACEMENT_GENERIC = "Karryn charms a goblin behind her into immediate sex!";
    var CHARM_LOG_REPLACEMENT_PUSSY = "Karryn seduces a goblin behind her into instant pussy pounding!";
    var CHARM_LOG_REPLACEMENT_ANAL = "Karryn lures a goblin behind her into instant anal breeding!";
    var CHARM_LOG_REPLACEMENT_CUNNI = "Karryn teases a goblin behind her into burying his face between her thighs!";
    var CHARM_LOG_REPLACEMENT_PUSSY_EXTREME = "Karryn drags a goblin behind her into immediate, sloppy pussy sex!";
    var CHARM_LOG_REPLACEMENT_ANAL_EXTREME = "Karryn baits a goblin behind her into immediate rough anal sex!";
    var CHARM_LOG_REPLACEMENT_CUNNI_EXTREME = "Karryn orders a goblin behind her to eat her out on the spot!";
    var CHARM_LOG_COCK_DESIRE_EXTREME_THRESHOLD = 100;
    var pendingCharmLogReplacementText = CHARM_LOG_REPLACEMENT_GENERIC;
    var pendingCharmLogReplacementReady = false;
    var pendingStripLogReplacementReady = false;
    var lastSelectedStripActorId = 0;
    var lastSelectedCharmTypeKey = '';
    var lastSelectedCharmActorId = 0;

    try {

    var debugLog = function(text) {
        if (!DEBUG_LOG) return;
        console.log('[' + MOD_NAME + '] ' + text);
    };

    var CHARM_ACTIONS = [
        { typeKey: 'pussy', skillIdVar: 'CHARM_GOBLIN_PUSSY_SKILL_ID', name: CHARM_ACTION_NAME_PUSSY, order: 117 },
        { typeKey: 'anal', skillIdVar: 'CHARM_GOBLIN_ANAL_SKILL_ID', name: CHARM_ACTION_NAME_ANAL, order: 116 },
        { typeKey: 'cunni', skillIdVar: 'CHARM_GOBLIN_CUNNI_SKILL_ID', name: CHARM_ACTION_NAME_CUNNI, order: 115 }
    ];

    var charmSkillTypeToId = function(typeKey) {
        if (typeKey === 'pussy') return CHARM_GOBLIN_PUSSY_SKILL_ID;
        if (typeKey === 'anal') return CHARM_GOBLIN_ANAL_SKILL_ID;
        if (typeKey === 'cunni') return CHARM_GOBLIN_CUNNI_SKILL_ID;
        return 0;
    };

    var isCharmSkillItem = function(item) {
        if (!item) return false;
        if (item.id === CHARM_GOBLIN_PUSSY_SKILL_ID || item.id === CHARM_GOBLIN_ANAL_SKILL_ID || item.id === CHARM_GOBLIN_CUNNI_SKILL_ID) return true;
        if (item._hotDeskCharmSkill) return true;
        if (item._hotDeskCharmSkillType) return true;
        if (item.name === CHARM_ACTION_NAME || item.name === CHARM_ACTION_NAME_PUSSY || item.name === CHARM_ACTION_NAME_ANAL || item.name === CHARM_ACTION_NAME_CUNNI) return true;
        if (typeof item.customAfterEval === 'string' &&
            (item.customAfterEval.indexOf('afterEval_receptionistBattle_charmGoblin') >= 0 ||
            item.customAfterEval.indexOf('afterEval_receptionistBattle_charmGoblin_pussy') >= 0 ||
            item.customAfterEval.indexOf('afterEval_receptionistBattle_charmGoblin_anal') >= 0 ||
            item.customAfterEval.indexOf('afterEval_receptionistBattle_charmGoblin_cunni') >= 0)) {
            return true;
        }
        return false;
    };

    var isCharmProxyKickAwayItem = function(item) {
        if (!item) return false;
        return pendingKickLogReplacementLines > 0 && item.id === RECEPTIONIST_KICK_AWAY_SKILL_ID;
    };

    var isStripSkillItem = function(item) {
        if (!item) return false;
        if (item.id === STRIP_DOWN_SKILL_ID) return true;
        if (item._hotDeskStripSkill) return true;
        if (item.name === STRIP_ACTION_NAME) return true;
        if (typeof item.customAfterEval === 'string' && item.customAfterEval.indexOf('afterEval_receptionistBattle_stripDown') >= 0) {
            return true;
        }
        return false;
    };

    var primePendingStripLogTextFromAction = function(actionItem) {
        if (!isStripSkillItem(actionItem)) return;
        pendingStripLogReplacementReady = true;
        if (pendingStripLogReplacementLines < 12) pendingStripLogReplacementLines = 12;
    };

    var getActiveStripReplacementText = function() {
        if (typeof BattleManager === 'undefined' || !BattleManager) return '';
        var subject = BattleManager._subject || null;
        if (!subject || typeof subject.isActor !== 'function' || !subject.isActor()) return '';
        if (typeof subject.currentAction !== 'function') return '';
        var action = subject.currentAction();
        if (!action || typeof action.item !== 'function') return '';
        var item = action.item();
        if (!isStripSkillItem(item)) return '';
        return STRIP_LOG_REPLACEMENT;
    };

    var getActorCockDesireValue = function(actor) {
        if (!actor) return 0;
        try {
            if (typeof actor.cockDesire === 'function') {
                var fnValue = Number(actor.cockDesire());
                return isNaN(fnValue) ? 0 : fnValue;
            }
            if (typeof actor.cockDesire === 'number') return actor.cockDesire;
            if (typeof actor._cockDesire === 'number') return actor._cockDesire;
            if (typeof actor.cockDesirePoints === 'function') {
                var pointsValue = Number(actor.cockDesirePoints());
                return isNaN(pointsValue) ? 0 : pointsValue;
            }
            if (typeof actor.cockDesirePoints === 'number') return actor.cockDesirePoints;
            if (typeof actor._cockDesirePoints === 'number') return actor._cockDesirePoints;
        } catch (err) {
            return 0;
        }
        return 0;
    };

    var isExtremeCharmLog = function(actor) {
        return getActorCockDesireValue(actor) > CHARM_LOG_COCK_DESIRE_EXTREME_THRESHOLD;
    };

    var getCharmLogReplacementByType = function(typeKey, actor) {
        var extreme = isExtremeCharmLog(actor);
        if (typeKey === 'pussy') return extreme ? CHARM_LOG_REPLACEMENT_PUSSY_EXTREME : CHARM_LOG_REPLACEMENT_PUSSY;
        if (typeKey === 'anal') return extreme ? CHARM_LOG_REPLACEMENT_ANAL_EXTREME : CHARM_LOG_REPLACEMENT_ANAL;
        if (typeKey === 'cunni') return extreme ? CHARM_LOG_REPLACEMENT_CUNNI_EXTREME : CHARM_LOG_REPLACEMENT_CUNNI;
        return CHARM_LOG_REPLACEMENT_GENERIC;
    };

    var getCharmTypeByJoinSkillId = function(skillId) {
        var pussyId = (typeof SKILL_ENEMY_POSEJOIN_RECEPTIONIST_PUSSY_ID !== 'undefined') ? SKILL_ENEMY_POSEJOIN_RECEPTIONIST_PUSSY_ID : 1731;
        var analId = (typeof SKILL_ENEMY_POSEJOIN_RECEPTIONIST_ANAL_ID !== 'undefined') ? SKILL_ENEMY_POSEJOIN_RECEPTIONIST_ANAL_ID : 1732;
        var cunniId = (typeof SKILL_ENEMY_POSEJOIN_RECEPTIONIST_CUNNI_ID !== 'undefined') ? SKILL_ENEMY_POSEJOIN_RECEPTIONIST_CUNNI_ID : 1730;
        if (skillId === pussyId) return 'pussy';
        if (skillId === analId) return 'anal';
        if (skillId === cunniId) return 'cunni';
        return '';
    };

    var getCharmTypeByItem = function(item) {
        if (!item) return '';
        if (item._hotDeskCharmSkillType) return String(item._hotDeskCharmSkillType).toLowerCase();
        if (item.id === CHARM_GOBLIN_PUSSY_SKILL_ID) return 'pussy';
        if (item.id === CHARM_GOBLIN_ANAL_SKILL_ID) return 'anal';
        if (item.id === CHARM_GOBLIN_CUNNI_SKILL_ID) return 'cunni';
        return '';
    };

    var primePendingCharmLogTextFromAction = function(subject, actionItem) {
        var typeKey = getCharmTypeByItem(actionItem);
        if (!typeKey) return;
        if (subject && typeof subject.actorId === 'function') lastSelectedCharmActorId = subject.actorId();
        lastSelectedCharmTypeKey = typeKey;
        pendingCharmLogReplacementText = getCharmLogReplacementByType(typeKey, subject);
        pendingCharmLogReplacementReady = true;
        if (pendingKickLogReplacementLines < 20) pendingKickLogReplacementLines = 20;
    };

    var getActiveCharmReplacementText = function() {
        if (typeof BattleManager === 'undefined' || !BattleManager) return '';
        var subject = BattleManager._subject || null;
        if (!subject || typeof subject.isActor !== 'function' || !subject.isActor()) return '';
        if (typeof subject.currentAction !== 'function') return '';
        var action = subject.currentAction();
        if (!action || typeof action.item !== 'function') return '';
        var item = action.item();
        if (!isCharmSkillItem(item)) return '';
        var typeKey = getCharmTypeByItem(item);
        if (!typeKey) return '';
        return getCharmLogReplacementByType(typeKey, subject);
    };

    var getLastSelectedCharmReplacementText = function() {
        if (!lastSelectedCharmTypeKey) return '';
        var actor = null;
        if (typeof $gameActors !== 'undefined' && $gameActors && typeof $gameActors.actor === 'function' && lastSelectedCharmActorId > 0) {
            actor = $gameActors.actor(lastSelectedCharmActorId);
        }
        return getCharmLogReplacementByType(lastSelectedCharmTypeKey, actor);
    };

    var getLastSelectedCharmTypeForActor = function(actor) {
        if (!lastSelectedCharmTypeKey) return '';
        if (!actor || typeof actor.actorId !== 'function') return '';
        var actorId = actor.actorId();
        if (!actorId || actorId !== lastSelectedCharmActorId) return '';
        return String(lastSelectedCharmTypeKey).toLowerCase();
    };

    var resolveKickAwayReplacementText = function() {
        return getActiveCharmReplacementText() || getLastSelectedCharmReplacementText() || pendingCharmLogReplacementText;
    };

    var findTaggedSkillId = function(tagName) {
        if (typeof $dataSkills === 'undefined' || !$dataSkills) return 0;
        for (var i = 1; i < $dataSkills.length; i++) {
            var skill = $dataSkills[i];
            if (skill && skill[tagName]) return i;
        }
        return 0;
    };

    var findTaggedSkillIdValue = function(tagName, tagValue) {
        if (typeof $dataSkills === 'undefined' || !$dataSkills) return 0;
        for (var i = 1; i < $dataSkills.length; i++) {
            var skill = $dataSkills[i];
            if (skill && skill[tagName] === tagValue) return i;
        }
        return 0;
    };

    var findFreeSkillId = function(startId) {
        if (typeof $dataSkills === 'undefined' || !$dataSkills) return startId;
        var id = startId;
        while ($dataSkills[id]) id++;
        return id;
    };

    var resolveCustomSkillIds = function() {
        if (typeof $dataSkills === 'undefined' || !$dataSkills) return;
        var usedCharmSkillIds = {};

        for (var i = 0; i < CHARM_ACTIONS.length; i++) {
            var action = CHARM_ACTIONS[i];
            var id = findTaggedSkillIdValue('_hotDeskCharmSkillType', action.typeKey);

            if (!id && action.typeKey === 'pussy') {
                id = findTaggedSkillId('_hotDeskCharmSkill');
            }
            if (!id) id = charmSkillTypeToId(action.typeKey);

            if (usedCharmSkillIds[id] || ($dataSkills[id] && !$dataSkills[id]._hotDeskCharmSkill && $dataSkills[id]._hotDeskCharmSkillType !== action.typeKey)) {
                id = findFreeSkillId(id + 1);
            }
            usedCharmSkillIds[id] = true;

            if (action.typeKey === 'pussy') CHARM_GOBLIN_PUSSY_SKILL_ID = id;
            if (action.typeKey === 'anal') CHARM_GOBLIN_ANAL_SKILL_ID = id;
            if (action.typeKey === 'cunni') CHARM_GOBLIN_CUNNI_SKILL_ID = id;
        }

        var taggedStripId = findTaggedSkillId('_hotDeskStripSkill');
        if (taggedStripId) STRIP_DOWN_SKILL_ID = taggedStripId;
        if (usedCharmSkillIds[STRIP_DOWN_SKILL_ID] || ($dataSkills[STRIP_DOWN_SKILL_ID] && !$dataSkills[STRIP_DOWN_SKILL_ID]._hotDeskStripSkill)) {
            STRIP_DOWN_SKILL_ID = findFreeSkillId(STRIP_DOWN_SKILL_ID + 1);
        }
    };

    var getBehindGoblin = function() {
        if (typeof $gameTroop === 'undefined' || !$gameTroop) return false;
        if (typeof GOBLIN_DISTANCE_CLOSE === 'undefined' || typeof GOBLIN_DISTANCE_MEDIUM === 'undefined') return false;
        if (!$gameTroop._goblins_distanceSlot) return false;

        var closeGoblin = $gameTroop._goblins_distanceSlot[GOBLIN_DISTANCE_CLOSE];
        if (closeGoblin && closeGoblin._visitor_isGoblin) {
            if (typeof closeGoblin.isInAPose !== 'function' || !closeGoblin.isInAPose()) {
                return closeGoblin;
            }
        }

        var mediumGoblin = $gameTroop._goblins_distanceSlot[GOBLIN_DISTANCE_MEDIUM];
        if (mediumGoblin && mediumGoblin._visitor_isGoblin) return mediumGoblin;
        return false;
    };

    var isBehindGoblin = function(goblin) {
        if (!goblin) return false;
        if (!goblin._visitor_isGoblin && !goblin.isGoblinType) return false;
        if (typeof goblin._goblinDistanceSlot === 'undefined') return false;
        if (typeof GOBLIN_DISTANCE_CLOSE === 'undefined' || typeof GOBLIN_DISTANCE_MEDIUM === 'undefined' || typeof GOBLIN_DISTANCE_FARTHEST === 'undefined') return false;

        // Exclude the front/counter goblin; only medium/far/farthest are treated as "behind".
        if (goblin._goblinDistanceSlot === GOBLIN_DISTANCE_CLOSE) return false;
        if (goblin._goblinDistanceSlot > GOBLIN_DISTANCE_MEDIUM) return false;
        if (goblin._goblinDistanceSlot < GOBLIN_DISTANCE_FARTHEST) return false;
        return true;
    };

    var getAnyBehindGoblin = function() {
        if (typeof $gameTroop === 'undefined' || !$gameTroop) return false;
        if (typeof GOBLIN_DISTANCE_FARTHEST === 'undefined' || typeof GOBLIN_DISTANCE_CLOSE === 'undefined') return false;
        if (!$gameTroop._goblins_distanceSlot) return false;

        for (var slot = GOBLIN_DISTANCE_MEDIUM; slot >= GOBLIN_DISTANCE_FARTHEST; slot--) {
            var goblin = $gameTroop._goblins_distanceSlot[slot];
            if (isBehindGoblin(goblin)) return goblin;
        }
        return false;
    };

    var getAnyCharmGoblin = function() {
        if (typeof $gameTroop === 'undefined' || !$gameTroop || !$gameTroop._goblins_distanceSlot) return false;
        var slots = [];
        if (typeof GOBLIN_DISTANCE_CLOSE !== 'undefined') slots.push(GOBLIN_DISTANCE_CLOSE);
        if (typeof GOBLIN_DISTANCE_MEDIUM !== 'undefined') slots.push(GOBLIN_DISTANCE_MEDIUM);
        if (typeof GOBLIN_DISTANCE_FAR !== 'undefined') slots.push(GOBLIN_DISTANCE_FAR);
        if (typeof GOBLIN_DISTANCE_FARTHEST !== 'undefined') slots.push(GOBLIN_DISTANCE_FARTHEST);
        for (var i = 0; i < slots.length; i++) {
            var goblin = $gameTroop._goblins_distanceSlot[slots[i]];
            if (goblin && (goblin._visitor_isGoblin || goblin.isGoblinType)) return goblin;
        }
        return false;
    };

    var moveGoblinToCloseIfNeeded = function(goblin) {
        if (!goblin || typeof GOBLIN_DISTANCE_CLOSE === 'undefined') return;
        if (typeof $gameTroop === 'undefined' || !$gameTroop || !$gameTroop._goblins_distanceSlot) return;
        if (typeof goblin._goblinDistanceSlot === 'undefined') return;
        if (goblin._goblinDistanceSlot === GOBLIN_DISTANCE_CLOSE) return;

        var closeGoblin = $gameTroop._goblins_distanceSlot[GOBLIN_DISTANCE_CLOSE];
        if (closeGoblin && closeGoblin !== goblin && typeof closeGoblin.isInAPose === 'function' && closeGoblin.isInAPose()) return;
        if (closeGoblin && closeGoblin !== goblin) {
            if (typeof closeGoblin._goblinDistanceSlot !== 'undefined') {
                closeGoblin._goblinDistanceSlot = goblin._goblinDistanceSlot;
            }
            $gameTroop._goblins_distanceSlot[goblin._goblinDistanceSlot] = closeGoblin;
        } else {
            $gameTroop._goblins_distanceSlot[goblin._goblinDistanceSlot] = false;
        }

        goblin._goblinDistanceSlot = GOBLIN_DISTANCE_CLOSE;
        $gameTroop._goblins_distanceSlot[GOBLIN_DISTANCE_CLOSE] = goblin;
    };

    var scrubRemTextFields = function(skill) {
        var remFields = [
            'hasRemNameDefault', 'hasRemNameJP', 'hasRemNameEN', 'hasRemNameRU', 'hasRemNameSCH', 'hasRemNameTCH', 'hasRemNameKR', 'hasRemNameSP',
            'remNameDefault', 'remNameJP', 'remNameEN', 'remNameRU', 'remNameSCH', 'remNameTCH', 'remNameKR', 'remNameSP',
            'hasRemDescDefault', 'hasRemDescJP', 'hasRemDescEN', 'hasRemDescRU', 'hasRemDescSCH', 'hasRemDescTCH', 'hasRemDescKR', 'hasRemDescSP',
            'remDescDefault', 'remDescJP', 'remDescEN', 'remDescRU', 'remDescSCH', 'remDescTCH', 'remDescKR', 'remDescSP'
        ];
        for (var i = 0; i < remFields.length; i++) {
            delete skill[remFields[i]];
        }
    };

    var applyCommonCustomSkillFields = function(skill, skillId, name, description, iconIndex) {
        skill.id = skillId;
        skill.name = name;
        skill.description = description;
        skill.iconIndex = iconIndex;
        skill.damage.type = 0;
        skill.damage.formula = '0';
        skill.message1 = '';
        skill.message2 = '';
        skill.mpCost = 0;
        skill.tpCost = 0;
        skill.hpCost = 0;
        skill.mpCostPer = 0;
        skill.tpCostPer = 0;
        skill.hpCostPer = 0;
        skill.mpCostEval = '';
        skill.tpCostEval = '';
        skill.hpCostEval = '';
        skill.executeEval = '';
        skill.customCostText = '';
        scrubRemTextFields(skill);
    };

    var clearSkillTags = function(skill) {
        if (!skill) return;
        skill.tags = [];
        if (typeof skill.removeTag === 'function') {
            skill.removeTag('KickSkill');
            skill.removeTag('ActorAttackSkill');
            skill.removeTag('ActorSexSkill');
        }
    };

    var applyCharmEvalFields = function(skill, typeKey) {
        skill.costShowEval = 'visible = this.showEval_receptionistBattle_charmGoblin();\n';
        skill.requireEval = 'value = this.customReq_receptionistBattle_charmGoblin();\n';
        skill.customBeforeEval = '';
        skill.customPreDamageEval = '';
        skill.customPostDamageEval = '';
        skill.customAfterEval = 'user.afterEval_receptionistBattle_charmGoblin_' + typeKey + '(target);\n';
        skill.selectConditions = [];
        skill.selectConditionEval = '';
    };

    var applyStripEvalFields = function(skill) {
        skill.costShowEval = 'visible = this.showEval_receptionistBattle_stripDown();\n';
        skill.requireEval = 'value = this.customReq_receptionistBattle_stripDown();\n';
        skill.customBeforeEval = '';
        skill.customPreDamageEval = '';
        skill.customPostDamageEval = '';
        skill.customAfterEval = 'user.afterEval_receptionistBattle_stripDown();\n';
        skill.selectConditions = [];
        skill.selectConditionEval = '';
    };

    var pickCharmSkillIdForced = function(goblin, actor, forcedTypeKey) {
        if (!goblin || !actor) return null;
        forcedTypeKey = (forcedTypeKey || '').toLowerCase();

        var pussyId = (typeof SKILL_ENEMY_POSEJOIN_RECEPTIONIST_PUSSY_ID !== 'undefined') ? SKILL_ENEMY_POSEJOIN_RECEPTIONIST_PUSSY_ID : 1731;
        var analId = (typeof SKILL_ENEMY_POSEJOIN_RECEPTIONIST_ANAL_ID !== 'undefined') ? SKILL_ENEMY_POSEJOIN_RECEPTIONIST_ANAL_ID : 1732;
        var cunniId = (typeof SKILL_ENEMY_POSEJOIN_RECEPTIONIST_CUNNI_ID !== 'undefined') ? SKILL_ENEMY_POSEJOIN_RECEPTIONIST_CUNNI_ID : 1730;

        if (forcedTypeKey === 'pussy') {
            if (typeof $dataSkills !== 'undefined' && $dataSkills && $dataSkills[pussyId]) return { skillId: pussyId, typeKey: 'pussy' };
            return null;
        }
        if (forcedTypeKey === 'anal') {
            if (typeof $dataSkills !== 'undefined' && $dataSkills && $dataSkills[analId]) return { skillId: analId, typeKey: 'anal' };
            return null;
        }
        if (forcedTypeKey === 'cunni') {
            if (typeof $dataSkills !== 'undefined' && $dataSkills && $dataSkills[cunniId]) return { skillId: cunniId, typeKey: 'cunni' };
            return null;
        }

        if (typeof SKILL_ENEMY_POSEJOIN_RECEPTIONIST_PUSSY_ID !== 'undefined' &&
            typeof goblin.canInsertPussy === 'function' && goblin.canInsertPussy(actor)) {
            return { skillId: pussyId, typeKey: 'pussy' };
        }
        if (typeof SKILL_ENEMY_POSEJOIN_RECEPTIONIST_ANAL_ID !== 'undefined' &&
            typeof goblin.canInsertAnal === 'function' && goblin.canInsertAnal(actor)) {
            return { skillId: analId, typeKey: 'anal' };
        }
        if (typeof SKILL_ENEMY_POSEJOIN_RECEPTIONIST_CUNNI_ID !== 'undefined' &&
            typeof goblin.canCunnilingus === 'function' && goblin.canCunnilingus(actor)) {
            return { skillId: cunniId, typeKey: 'cunni' };
        }

        // Force a receptionist join skill even when strict condition checks fail.
        if (typeof $dataSkills !== 'undefined' && $dataSkills) {
            if ($dataSkills[pussyId]) return { skillId: pussyId, typeKey: 'pussy' };
            if ($dataSkills[analId]) return { skillId: analId, typeKey: 'anal' };
            if ($dataSkills[cunniId]) return { skillId: cunniId, typeKey: 'cunni' };
        }
        return null;
    };

    var clearCumFromActor = function(actor) {
        if (!actor) return;
        if (typeof BodyLiquidId !== 'undefined' && BodyLiquidId && typeof actor.getBodyLiquid === 'function') {
            for (var liquidKey in BodyLiquidId) {
                if (!Object.prototype.hasOwnProperty.call(BodyLiquidId, liquidKey)) continue;
                if (String(liquidKey).indexOf('_SEMEN') < 0) continue;
                var liquidId = BodyLiquidId[liquidKey];
                var liquid = actor.getBodyLiquid(liquidId);
                if (liquid && typeof liquid.reset === 'function') liquid.reset();
            }
            if (typeof actor.setCacheChanged === 'function') actor.setCacheChanged();
            return;
        }

        // Fallback for older liquid systems without BodyLiquidId API.
        if (typeof actor.resetLiquidsExceptPussyJuice === 'function') {
            actor.resetLiquidsExceptPussyJuice();
        }
    };

    var tryCharmGoblinInstantSex = function(actor, goblin, forcedTypeKey) {
        if (!actor) return false;

        var selectedGoblin = isBehindGoblin(goblin) ? goblin : (getAnyBehindGoblin() || getAnyCharmGoblin());
        if (!selectedGoblin) {
            debugLog(CHARM_ACTION_NAME + ': target is not behind Karryn.');
            return false;
        }
        if (!selectedGoblin._visitor_isGoblin && !selectedGoblin.isGoblinType) return false;
        if (typeof selectedGoblin.useAISkill !== 'function') return false;

        // Put the selected behind goblin into a join-valid slot first.
        moveGoblinToCloseIfNeeded(selectedGoblin);

        var charmJoin = pickCharmSkillIdForced(selectedGoblin, actor, forcedTypeKey);
        if (!charmJoin || !charmJoin.skillId) {
            debugLog(CHARM_ACTION_NAME + ': no valid receptionist pose-join skill for current state.');
            pendingCharmLogReplacementReady = false;
            return false;
        }
        var skillId = charmJoin.skillId;

        var resolvedTypeKey = charmJoin.typeKey || forcedTypeKey || getCharmTypeByJoinSkillId(skillId);
        pendingCharmLogReplacementText = getCharmLogReplacementByType(resolvedTypeKey, actor);
        pendingCharmLogReplacementReady = true;
        pendingKickLogReplacementLines = 20;
        selectedGoblin.useAISkill(skillId, actor);
        selectedGoblin._goblinActionCooldown = 1;

        if (typeof BattleManager !== 'undefined' && BattleManager && typeof BattleManager.playSpecialBgm_ReceptionistSex === 'function') {
            BattleManager.playSpecialBgm_ReceptionistSex();
        }

        actor.resetSexSkillConsUsage(false);
        actor.emoteReceptionistPose();
        if (typeof actor.updateReceptionistBattleGoblinTachie === 'function') {
            actor.updateReceptionistBattleGoblinTachie();
        }
        if (resolvedTypeKey === 'cunni') {
            clearCumFromActor(actor);
        }

        debugLog(CHARM_ACTION_NAME + ' triggered instant sex join skill ' + String(skillId) + '.');
        return true;
    };

    var setupActorMethods = function() {
        if (typeof Game_Actor === 'undefined' || !Game_Actor.prototype) return;

        Game_Actor.prototype.showEval_receptionistBattle_charmGoblin = function() {
            if (typeof $gameTroop === 'undefined' || !$gameTroop) return false;
            return !!getAnyBehindGoblin();
        };

        Game_Actor.prototype.customReq_receptionistBattle_charmGoblin = function() {
            if (typeof this.receptionistBattle_isLayingOnDesk !== 'function') return false;
            if (typeof this.receptionistBattle_isHavingSexBehind !== 'function') return false;
            return !this.receptionistBattle_isLayingOnDesk() &&
                !this.receptionistBattle_isHavingSexBehind();
        };

        Game_Actor.prototype.skillCost_receptionistBattle_charmGoblin = function() {
            if (typeof this.skillCost_receptionistBattle_kickAway === 'function') {
                return this.skillCost_receptionistBattle_kickAway();
            }
            return 0;
        };

        Game_Actor.prototype.afterEval_receptionistBattle_charmGoblin = function(target) {
            if (!target) target = getAnyBehindGoblin();
            if (tryCharmGoblinInstantSex(this, target)) return;

            if (typeof BattleManager !== 'undefined' && BattleManager && BattleManager._logWindow) {
                BattleManager._logWindow.push('addText', CHARM_ACTION_NAME + ' failed.');
            }
            this.resetSexSkillConsUsage(false);
        };

        Game_Actor.prototype.afterEval_receptionistBattle_charmGoblin_pussy = function(target) {
            if (!target) target = getAnyBehindGoblin();
            if (tryCharmGoblinInstantSex(this, target, 'pussy')) return;
            if (typeof BattleManager !== 'undefined' && BattleManager && BattleManager._logWindow) {
                BattleManager._logWindow.push('addText', CHARM_ACTION_NAME_PUSSY + ' failed.');
            }
            this.resetSexSkillConsUsage(false);
        };

        Game_Actor.prototype.afterEval_receptionistBattle_charmGoblin_anal = function(target) {
            if (!target) target = getAnyBehindGoblin();
            if (tryCharmGoblinInstantSex(this, target, 'anal')) return;
            if (typeof BattleManager !== 'undefined' && BattleManager && BattleManager._logWindow) {
                BattleManager._logWindow.push('addText', CHARM_ACTION_NAME_ANAL + ' failed.');
            }
            this.resetSexSkillConsUsage(false);
        };

        Game_Actor.prototype.afterEval_receptionistBattle_charmGoblin_cunni = function(target) {
            if (!target) target = getAnyBehindGoblin();
            if (tryCharmGoblinInstantSex(this, target, 'cunni')) return;
            if (typeof BattleManager !== 'undefined' && BattleManager && BattleManager._logWindow) {
                BattleManager._logWindow.push('addText', CHARM_ACTION_NAME_CUNNI + ' failed.');
            }
            this.resetSexSkillConsUsage(false);
        };

        Game_Actor.prototype.showEval_receptionistBattle_stripDown = function() {
            return true;
        };

        Game_Actor.prototype.canUse_receptionistBattle_stripDown = function() {
            var hasClothingLeft = true;
            if (typeof this.isClothingMaxDamaged === 'function') {
                hasClothingLeft = !this.isClothingMaxDamaged();
            }

            // Prefer direct internal state for panties because some builds return
            // debug-gated values from isWearingPanties().
            var hasPantiesLeft = false;
            if (typeof this._wearingPanties === 'boolean') hasPantiesLeft = this._wearingPanties;
            if (this._lostPanties === true) hasPantiesLeft = false;
            if (!hasPantiesLeft && typeof this.isWearingPanties === 'function') {
                try {
                    hasPantiesLeft = !!this.isWearingPanties();
                } catch (err) {
                    hasPantiesLeft = false;
                }
            }

            return hasClothingLeft || hasPantiesLeft;
        };

        Game_Actor.prototype.customReq_receptionistBattle_stripDown = function() {
            return this.canUse_receptionistBattle_stripDown();
        };

        Game_Actor.prototype.skillCost_receptionistBattle_stripDown = function() {
            return 0;
        };

        Game_Actor.prototype.afterEval_receptionistBattle_stripDown = function() {
            if (typeof this.canUse_receptionistBattle_stripDown === 'function' && !this.canUse_receptionistBattle_stripDown()) {
                this.resetSexSkillConsUsage(false);
                return;
            }
            if (typeof this.stripOffClothing === 'function') this.stripOffClothing();
            if (typeof this.stripOffPanties === 'function') this.stripOffPanties();
            this.resetSexSkillConsUsage(false);
            this.emoteReceptionistPose();
            if (typeof this.updateReceptionistBattleGoblinTachie === 'function') {
                this.updateReceptionistBattleGoblinTachie();
            }
        };
    };

    var setupEnemyMethods = function() {
        if (typeof Game_Enemy === 'undefined' || !Game_Enemy.prototype) return;

        Game_Enemy.prototype.isValidTargetForReceptionistBattle_charmGoblin = function() {
            if (!isBehindGoblin(this)) return false;
            return this === getAnyBehindGoblin();
        };
    };

    var buildCharmGoblinSkillNote = function(orderValue, typeKey) {
        return [
            '<order:' + orderValue + '>',
            '<Custom Show Eval>',
            'visible = this.showEval_receptionistBattle_charmGoblin();',
            '</Custom Show Eval>',
            '<Custom Requirement>',
            'value = this.customReq_receptionistBattle_charmGoblin();',
            '</Custom Requirement>',
            '<After Eval>',
            'user.afterEval_receptionistBattle_charmGoblin_' + typeKey + '(target);',
            '</After Eval>',
            '<Custom HP Cost>',
            'cost = this.skillCost_receptionistBattle_charmGoblin();',
            '</Custom HP Cost>',
            '<damage formula>',
            'value = 0;',
            '</damage formula>'
        ].join('\n');
    };

    var buildStripDownSkillNote = function() {
        return [
            '<order:114>',
            '<Custom Show Eval>',
            'visible = this.showEval_receptionistBattle_stripDown();',
            '</Custom Show Eval>',
            '<Custom Requirement>',
            'value = this.customReq_receptionistBattle_stripDown();',
            '</Custom Requirement>',
            '<After Eval>',
            'user.afterEval_receptionistBattle_stripDown();',
            '</After Eval>',
            '<Custom HP Cost>',
            'cost = this.skillCost_receptionistBattle_stripDown();',
            '</Custom HP Cost>',
            '<damage formula>',
            'value = 0;',
            '</damage formula>'
        ].join('\n');
    };

    var installCharmGoblinSkillData = function() {
        if (typeof $dataSkills === 'undefined' || !$dataSkills || !$dataSkills[RECEPTIONIST_KICK_AWAY_SKILL_ID]) return;
        resolveCustomSkillIds();

        var baseSkill = $dataSkills[RECEPTIONIST_KICK_AWAY_SKILL_ID];
        for (var i = 0; i < CHARM_ACTIONS.length; i++) {
            var action = CHARM_ACTIONS[i];
            var actionSkillId = charmSkillTypeToId(action.typeKey);
            if (!actionSkillId) continue;

            if ($dataSkills[actionSkillId] &&
                !$dataSkills[actionSkillId]._hotDeskCharmSkill &&
                $dataSkills[actionSkillId]._hotDeskCharmSkillType !== action.typeKey) {
                continue;
            }

            var charmSkill = $dataSkills[actionSkillId] &&
                ($dataSkills[actionSkillId]._hotDeskCharmSkill || $dataSkills[actionSkillId]._hotDeskCharmSkillType === action.typeKey) ?
                $dataSkills[actionSkillId] :
                JSON.parse(JSON.stringify(baseSkill));

            applyCommonCustomSkillFields(charmSkill, actionSkillId, action.name, CHARM_ACTION_DESC, 84);
            charmSkill.scope = 11;
            charmSkill.animationId = 0;
            charmSkill.effects = [];
            charmSkill.note = buildCharmGoblinSkillNote(action.order, action.typeKey);
            clearSkillTags(charmSkill);
            applyCharmEvalFields(charmSkill, action.typeKey);
            charmSkill._hotDeskCharmSkill = true;
            charmSkill._hotDeskCharmSkillType = action.typeKey;

            $dataSkills[actionSkillId] = charmSkill;
        }
    };

    var patchCharmGoblinExecution = function() {
        if (typeof Game_Action === 'undefined' || !Game_Action.prototype || typeof Game_Action.prototype.apply !== 'function') return;
        if (Game_Action.prototype._hotDeskCharmApplyPatched) return;
        Game_Action.prototype._hotDeskCharmApplyPatched = true;

        if (typeof Game_Action.prototype.setSkill === 'function' && !Game_Action.prototype._hotDeskSetSkillPatched) {
            Game_Action.prototype._hotDeskSetSkillPatched = true;
            var originalSetSkill = Game_Action.prototype.setSkill;
            Game_Action.prototype.setSkill = function(skillId) {
                originalSetSkill.apply(this, arguments);
                if (skillId === STRIP_DOWN_SKILL_ID) {
                    pendingStripLogReplacementReady = true;
                    if (pendingStripLogReplacementLines < 20) pendingStripLogReplacementLines = 20;
                    if (typeof this.subject === 'function') {
                        var stripSubject = this.subject();
                        if (stripSubject && typeof stripSubject.actorId === 'function') lastSelectedStripActorId = stripSubject.actorId();
                    }
                } else if (skillId !== RECEPTIONIST_FIX_CLOTHES_SKILL_ID) {
                    pendingStripLogReplacementLines = 0;
                    pendingStripLogReplacementReady = false;
                }

                if (skillId === CHARM_GOBLIN_PUSSY_SKILL_ID) lastSelectedCharmTypeKey = 'pussy';
                else if (skillId === CHARM_GOBLIN_ANAL_SKILL_ID) lastSelectedCharmTypeKey = 'anal';
                else if (skillId === CHARM_GOBLIN_CUNNI_SKILL_ID) lastSelectedCharmTypeKey = 'cunni';
                if (lastSelectedCharmTypeKey && typeof this.subject === 'function') {
                    var subject = this.subject();
                    if (subject && typeof subject.actorId === 'function') lastSelectedCharmActorId = subject.actorId();
                    pendingCharmLogReplacementText = getCharmLogReplacementByType(lastSelectedCharmTypeKey, subject);
                    pendingCharmLogReplacementReady = true;
                    if (pendingKickLogReplacementLines < 20) pendingKickLogReplacementLines = 20;
                }
            };
        }

        if (typeof Game_Action.prototype.isActorKickSkill === 'function') {
            var originalIsActorKickSkill = Game_Action.prototype.isActorKickSkill;
            Game_Action.prototype.isActorKickSkill = function() {
                var item = (typeof this.item === 'function') ? this.item() : null;
                if (isCharmSkillItem(item) || isCharmProxyKickAwayItem(item)) return false;
                return originalIsActorKickSkill.apply(this, arguments);
            };
        }
        if (typeof Game_Action.prototype.isActorAttackSkill === 'function') {
            var originalIsActorAttackSkill = Game_Action.prototype.isActorAttackSkill;
            Game_Action.prototype.isActorAttackSkill = function() {
                var item = (typeof this.item === 'function') ? this.item() : null;
                if (isCharmSkillItem(item) || isCharmProxyKickAwayItem(item)) return false;
                return originalIsActorAttackSkill.apply(this, arguments);
            };
        }

        var originalApply = Game_Action.prototype.apply;
        Game_Action.prototype.apply = function(target) {
            var item = (typeof this.item === 'function') ? this.item() : null;
            if (isCharmSkillItem(item)) {
                var user = (typeof this.subject === 'function') ? this.subject() : null;
                var forcedTypeKey = item && item._hotDeskCharmSkillType ? item._hotDeskCharmSkillType : '';
                var success = tryCharmGoblinInstantSex(user, target || getAnyBehindGoblin(), forcedTypeKey);

                if (!success && typeof BattleManager !== 'undefined' && BattleManager && BattleManager._logWindow) {
                    var actionName = item && item.name ? item.name : CHARM_ACTION_NAME;
                    BattleManager._logWindow.push('addText', actionName + ' failed.');
                }
                return;
            }

            originalApply.apply(this, arguments);
        };
    };

    var patchKickAwayCallbackHijack = function() {
        if (typeof Game_Actor === 'undefined' || !Game_Actor.prototype) return;
        if (typeof Game_Actor.prototype.afterEval_receptionistBattle_kickAway !== 'function') return;
        if (Game_Actor.prototype._hotDeskKickAwayHijacked) return;
        Game_Actor.prototype._hotDeskKickAwayHijacked = true;

        var originalKickAwayAfterEval = Game_Actor.prototype.afterEval_receptionistBattle_kickAway;
        Game_Actor.prototype.afterEval_receptionistBattle_kickAway = function(target) {
            var action = (typeof this.currentAction === 'function') ? this.currentAction() : null;
            var item = action && typeof action.item === 'function' ? action.item() : null;
            var targetIsActor = target && typeof target.isActor === 'function' && target.isActor();
            if ((isCharmSkillItem(item) || targetIsActor) && typeof this.afterEval_receptionistBattle_charmGoblin === 'function') {
                var forcedTypeKey = item && item._hotDeskCharmSkillType ? item._hotDeskCharmSkillType : '';
                if (!forcedTypeKey) forcedTypeKey = getLastSelectedCharmTypeForActor(this);
                if (forcedTypeKey === 'pussy' && typeof this.afterEval_receptionistBattle_charmGoblin_pussy === 'function') {
                    this.afterEval_receptionistBattle_charmGoblin_pussy(target || getAnyBehindGoblin());
                    return;
                }
                if (forcedTypeKey === 'anal' && typeof this.afterEval_receptionistBattle_charmGoblin_anal === 'function') {
                    this.afterEval_receptionistBattle_charmGoblin_anal(target || getAnyBehindGoblin());
                    return;
                }
                if (forcedTypeKey === 'cunni' && typeof this.afterEval_receptionistBattle_charmGoblin_cunni === 'function') {
                    this.afterEval_receptionistBattle_charmGoblin_cunni(target || getAnyBehindGoblin());
                    return;
                }
                this.afterEval_receptionistBattle_charmGoblin(target || getAnyBehindGoblin());
                return;
            }
            originalKickAwayAfterEval.apply(this, arguments);
        };
    };

    var patchApplyAfterEvalCharmGuard = function() {
        if (typeof Game_Action === 'undefined' || !Game_Action.prototype) return;
        if (typeof Game_Action.prototype.applyAfterEval !== 'function') return;
        if (Game_Action.prototype._hotDeskAfterEvalGuardPatched) return;
        Game_Action.prototype._hotDeskAfterEvalGuardPatched = true;

        var originalApplyAfterEval = Game_Action.prototype.applyAfterEval;
        Game_Action.prototype.applyAfterEval = function(target) {
            var item = (typeof this.item === 'function') ? this.item() : null;
            if (isCharmSkillItem(item)) {
                var user = (typeof this.subject === 'function') ? this.subject() : null;
                if (user) {
                    var forcedTypeKey = item && item._hotDeskCharmSkillType ? item._hotDeskCharmSkillType : '';
                    if (!forcedTypeKey) forcedTypeKey = getLastSelectedCharmTypeForActor(user);
                    if (forcedTypeKey === 'pussy' && typeof user.afterEval_receptionistBattle_charmGoblin_pussy === 'function') {
                        user.afterEval_receptionistBattle_charmGoblin_pussy(getAnyBehindGoblin());
                        return;
                    }
                    if (forcedTypeKey === 'anal' && typeof user.afterEval_receptionistBattle_charmGoblin_anal === 'function') {
                        user.afterEval_receptionistBattle_charmGoblin_anal(getAnyBehindGoblin());
                        return;
                    }
                    if (forcedTypeKey === 'cunni' && typeof user.afterEval_receptionistBattle_charmGoblin_cunni === 'function') {
                        user.afterEval_receptionistBattle_charmGoblin_cunni(getAnyBehindGoblin());
                        return;
                    }
                }
                if (user && typeof user.afterEval_receptionistBattle_charmGoblin === 'function') {
                    user.afterEval_receptionistBattle_charmGoblin(getAnyBehindGoblin());
                    return;
                }
            }
            originalApplyAfterEval.apply(this, arguments);
        };
    };

    var patchSceneBattleStartReassert = function() {
        if (typeof Scene_Battle === 'undefined' || !Scene_Battle.prototype || typeof Scene_Battle.prototype.start !== 'function') return;
        if (Scene_Battle.prototype._hotDeskStartPatched) return;
        Scene_Battle.prototype._hotDeskStartPatched = true;

        var originalSceneBattleStart = Scene_Battle.prototype.start;
        Scene_Battle.prototype.start = function() {
            setupActorMethods();
            setupEnemyMethods();
            patchCharmGoblinExecution();
            patchKickAwayCallbackHijack();
            patchApplyAfterEvalCharmGuard();
            patchBattleLogKickLineFilter();
            patchBattleLogDisplayAction();
            patchActionRemLinesReplacement();
            originalSceneBattleStart.apply(this, arguments);
        };
    };

    var patchBattleLogKickLineFilter = function() {
        if (typeof Window_BattleLog === 'undefined' || !Window_BattleLog.prototype || typeof Window_BattleLog.prototype.addText !== 'function') return;
        if (Window_BattleLog.prototype.addText && Window_BattleLog.prototype.addText._hotDeskKickLineFilterWrapped) return;

        if (typeof Window_BattleLog.prototype.push === 'function') {
            if (!(Window_BattleLog.prototype.push && Window_BattleLog.prototype.push._hotDeskKickLineFilterPushWrapped)) {
                var originalPush = Window_BattleLog.prototype.push;
                Window_BattleLog.prototype.push = function(methodName) {
                    if (methodName === 'addText' && arguments.length >= 2 && typeof arguments[1] === 'string') {
                        if (/Karryn\s+kicks\s+Karryn\s+away!/i.test(arguments[1])) {
                            var activeReplacement = getActiveCharmReplacementText();
                            if (activeReplacement) {
                                pendingCharmLogReplacementText = activeReplacement;
                                pendingCharmLogReplacementReady = true;
                                if (pendingKickLogReplacementLines < 20) pendingKickLogReplacementLines = 20;
                                arguments[1] = pendingCharmLogReplacementText;
                            } else if (pendingKickLogReplacementLines > 0 || pendingCharmLogReplacementReady) {
                                arguments[1] = pendingCharmLogReplacementText;
                            }
                        }
                    }
                    return originalPush.apply(this, arguments);
                };
                Window_BattleLog.prototype.push._hotDeskKickLineFilterPushWrapped = true;
            }
        }

        var originalAddText = Window_BattleLog.prototype.addText;
        Window_BattleLog.prototype.addText = function(text) {
            if (typeof text === 'string' && /Karryn\s+fixes\s+her\s+skirt/i.test(text)) {
                var activeStripReplacement = getActiveStripReplacementText();
                if (activeStripReplacement) {
                    text = activeStripReplacement;
                    pendingStripLogReplacementReady = true;
                    if (pendingStripLogReplacementLines < 12) pendingStripLogReplacementLines = 12;
                } else if (pendingStripLogReplacementLines > 0 || pendingStripLogReplacementReady) {
                    text = STRIP_LOG_REPLACEMENT;
                }
            }

            if (typeof text === 'string' && /Karryn\s+kicks\s+Karryn\s+away!/i.test(text)) {
                var replacementText = resolveKickAwayReplacementText();
                if (replacementText) {
                    pendingCharmLogReplacementText = replacementText;
                    pendingCharmLogReplacementReady = true;
                    if (pendingKickLogReplacementLines < 20) pendingKickLogReplacementLines = 20;
                    text = pendingCharmLogReplacementText;
                } else if (pendingKickLogReplacementLines > 0 || pendingCharmLogReplacementReady) {
                    text = pendingCharmLogReplacementText;
                }
            }

            if (pendingKickLogReplacementLines > 0 && typeof text === 'string') {
                // Only replace the malformed self-kick line from the charm proxy flow.
                if (/Karryn\s+kicks\s+Karryn\s+away!/i.test(text)) {
                    pendingKickLogReplacementLines = 0;
                    pendingCharmLogReplacementReady = false;
                    originalAddText.call(this, pendingCharmLogReplacementText);
                    return;
                }
                pendingKickLogReplacementLines--;
            }

            if (pendingStripLogReplacementLines > 0 && typeof text === 'string') {
                if (/Karryn\s+fixes\s+her\s+skirt/i.test(text)) {
                    pendingStripLogReplacementLines = 0;
                    pendingStripLogReplacementReady = false;
                    originalAddText.call(this, STRIP_LOG_REPLACEMENT);
                    return;
                }
                pendingStripLogReplacementLines--;
            }
            originalAddText.call(this, text);
        };
        Window_BattleLog.prototype.addText._hotDeskKickLineFilterWrapped = true;
    };

    var patchBattleLogDisplayAction = function() {
        if (typeof Window_BattleLog === 'undefined' || !Window_BattleLog.prototype || typeof Window_BattleLog.prototype.displayAction !== 'function') return;
        if (Window_BattleLog.prototype.displayAction && Window_BattleLog.prototype.displayAction._hotDeskDisplayActionWrapped) return;

        var originalDisplayAction = Window_BattleLog.prototype.displayAction;
        Window_BattleLog.prototype.displayAction = function(subject, item) {
            var isKickAwaySkill = item && item.id === RECEPTIONIST_KICK_AWAY_SKILL_ID;
            var isActorSubject = subject && typeof subject.isActor === 'function' && subject.isActor();
            var action = isActorSubject && typeof subject.currentAction === 'function' ? subject.currentAction() : null;
            var currentActionItem = action && typeof action.item === 'function' ? action.item() : null;
            var currentActionIsCharm = isCharmSkillItem(currentActionItem);
            var currentActionIsStrip = isStripSkillItem(currentActionItem);
            primePendingCharmLogTextFromAction(subject, currentActionItem);
            primePendingStripLogTextFromAction(currentActionItem);
            var inCharmReplacementWindow = pendingKickLogReplacementLines > 0;
            var selfTargeted = action && typeof action.subject === 'function' && typeof action._targetIndex !== 'undefined' &&
                action._targetIndex === action.subject().index();

            if (isActorSubject && !isStripSkillItem(item) && !currentActionIsStrip) {
                pendingStripLogReplacementLines = 0;
                pendingStripLogReplacementReady = false;
            }

            // If this is a real Kick Away action (not charm proxy), clear stale charm replacement state.
            if (isKickAwaySkill && isActorSubject && !currentActionIsCharm && !selfTargeted) {
                pendingKickLogReplacementLines = 0;
                pendingCharmLogReplacementReady = false;
            }

            // In the malformed charm flow, the action resolves as Kick Away targeting Karryn herself.
            // Replace only that specific log line with the custom charm line.
            if (isKickAwaySkill && isActorSubject && (selfTargeted || currentActionIsCharm || (inCharmReplacementWindow && pendingCharmLogReplacementReady))) {
                this.push('addText', pendingCharmLogReplacementText);
                pendingCharmLogReplacementReady = false;
                return;
            }
            originalDisplayAction.apply(this, arguments);
        };
        Window_BattleLog.prototype.displayAction._hotDeskDisplayActionWrapped = true;

        if (typeof Window_BattleLog.prototype.displayRemLine === 'function' &&
            !(Window_BattleLog.prototype.displayRemLine && Window_BattleLog.prototype.displayRemLine._hotDeskDisplayRemLineWrapped)) {
            var originalDisplayRemLine = Window_BattleLog.prototype.displayRemLine;
            Window_BattleLog.prototype.displayRemLine = function(text) {
                if (typeof text === 'string' && /Karryn\s+fixes\s+her\s+skirt/i.test(text)) {
                    var stripReplacementText = getActiveStripReplacementText();
                    if (stripReplacementText) {
                        text = stripReplacementText;
                    } else if (pendingStripLogReplacementLines > 0 || pendingStripLogReplacementReady) {
                        text = STRIP_LOG_REPLACEMENT;
                    }
                }
                if (typeof text === 'string' && /Karryn\s+kicks\s+Karryn\s+away!/i.test(text)) {
                    var replacementText = resolveKickAwayReplacementText();
                    if (replacementText) text = replacementText;
                }
                return originalDisplayRemLine.apply(this, arguments.length ? [text] : arguments);
            };
            Window_BattleLog.prototype.displayRemLine._hotDeskDisplayRemLineWrapped = true;
        }
    };

    var patchActionRemLinesReplacement = function() {
        if (typeof BattleManager === 'undefined' || typeof BattleManager.actionRemLines !== 'function') return;
        if (BattleManager.actionRemLines && BattleManager.actionRemLines._hotDeskActionRemLinesWrapped) return;

        var originalActionRemLines = BattleManager.actionRemLines;
        BattleManager.actionRemLines = function(lineType) {
            var kickLineId = (typeof KARRYN_LINE_RECEPTIONIST_KICK_AWAY !== 'undefined') ? KARRYN_LINE_RECEPTIONIST_KICK_AWAY : RECEPTIONIST_KICK_AWAY_LINE_ID;
            if (pendingKickLogReplacementLines > 0 && lineType === kickLineId) {
                var activeReplacement = getActiveCharmReplacementText();
                if (activeReplacement) {
                    pendingKickLogReplacementLines = 0;
                    pendingCharmLogReplacementReady = false;
                    if (this._logWindow && typeof this._logWindow.displayRemLine === 'function') {
                        this._logWindow.displayRemLine(activeReplacement);
                        return false;
                    }
                } else {
                    pendingKickLogReplacementLines = 0;
                    pendingCharmLogReplacementReady = false;
                }
            }
            return originalActionRemLines.apply(this, arguments);
        };
        BattleManager.actionRemLines._hotDeskActionRemLinesWrapped = true;
    };

    var installStripDownSkillData = function() {
        if (typeof $dataSkills === 'undefined' || !$dataSkills || !$dataSkills[RECEPTIONIST_FIX_CLOTHES_SKILL_ID]) return;
        resolveCustomSkillIds();

        if ($dataSkills[STRIP_DOWN_SKILL_ID] && !$dataSkills[STRIP_DOWN_SKILL_ID]._hotDeskStripSkill) return;

        var baseSkill = $dataSkills[RECEPTIONIST_FIX_CLOTHES_SKILL_ID];
        var stripSkill = $dataSkills[STRIP_DOWN_SKILL_ID] && $dataSkills[STRIP_DOWN_SKILL_ID]._hotDeskStripSkill ?
            $dataSkills[STRIP_DOWN_SKILL_ID] :
            JSON.parse(JSON.stringify(baseSkill));

        applyCommonCustomSkillFields(stripSkill, STRIP_DOWN_SKILL_ID, STRIP_ACTION_NAME, STRIP_ACTION_DESC, 128);
        stripSkill.note = buildStripDownSkillNote();
        applyStripEvalFields(stripSkill);
        stripSkill._hotDeskStripSkill = true;

        $dataSkills[STRIP_DOWN_SKILL_ID] = stripSkill;
    };

    var isKarrynActor = function(actor) {
        if (!actor) return false;
        if (typeof actor.isActor !== 'function' || !actor.isActor()) return false;
        if (typeof actor.actorId !== 'function') return false;
        var karrynActorId = (typeof ACTOR_KARRYN_ID !== 'undefined') ? ACTOR_KARRYN_ID : 1;
        return actor.actorId() === karrynActorId;
    };

    var isInReceptionistBattleContext = function() {
        if (typeof $gameParty === 'undefined' || !$gameParty) return false;
        return !!$gameParty.isInReceptionistBattle;
    };

    var buildHotDeskTempSkillList = function() {
        return [
            CHARM_GOBLIN_PUSSY_SKILL_ID,
            CHARM_GOBLIN_ANAL_SKILL_ID,
            CHARM_GOBLIN_CUNNI_SKILL_ID,
            STRIP_DOWN_SKILL_ID
        ];
    };

    var patchTemporarySkillInjection = function() {
        if (typeof Game_Actor === 'undefined' || !Game_Actor.prototype) return;
        if (typeof Game_Actor.prototype.addedSkills !== 'function') return;
        if (Game_Actor.prototype._hotDeskAddedSkillsPatched) return;
        Game_Actor.prototype._hotDeskAddedSkillsPatched = true;

        var originalAddedSkills = Game_Actor.prototype.addedSkills;
        Game_Actor.prototype.addedSkills = function() {
            var result = originalAddedSkills.apply(this, arguments);
            if (!Array.isArray(result)) result = [];
            if (!isKarrynActor(this) || !isInReceptionistBattleContext()) return result;

            var tempSkills = buildHotDeskTempSkillList();
            for (var i = 0; i < tempSkills.length; i++) {
                var skillId = tempSkills[i];
                if (skillId > 0 && result.indexOf(skillId) < 0) result.push(skillId);
            }
            return result;
        };

        installCharmGoblinSkillData();
        installStripDownSkillData();
    };

    var patchSaveLoadSkillDataInstall = function() {
        if (typeof DataManager === 'undefined') return;

        if (typeof DataManager.createGameObjects === 'function') {
            var originalCreateGameObjects = DataManager.createGameObjects;
            DataManager.createGameObjects = function() {
                originalCreateGameObjects.apply(this, arguments);
                installCharmGoblinSkillData();
                installStripDownSkillData();
            };
        }

        if (typeof DataManager.extractSaveContents === 'function') {
            var originalExtractSaveContents = DataManager.extractSaveContents;
            DataManager.extractSaveContents = function(contents) {
                originalExtractSaveContents.apply(this, arguments);
                installCharmGoblinSkillData();
                installStripDownSkillData();
            };
        }
    };

        if (!KarrynsHotDesk._patched) {
            KarrynsHotDesk._patched = true;
            installCharmGoblinSkillData();
            installStripDownSkillData();
            setupActorMethods();
            setupEnemyMethods();
            patchCharmGoblinExecution();
            patchKickAwayCallbackHijack();
            patchApplyAfterEvalCharmGuard();
            patchSceneBattleStartReassert();
            patchBattleLogKickLineFilter();
            patchBattleLogDisplayAction();
            patchActionRemLinesReplacement();
            patchTemporarySkillInjection();
            patchSaveLoadSkillDataInstall();
            debugLog('Receptionist action patches applied.');
        }
    } catch (err) {
        console.error('[' + MOD_NAME + '] Fatal init error.', err);
    }
})();
