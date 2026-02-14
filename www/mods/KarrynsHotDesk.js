// #MODS TXT LINES:
// {"name":"KarrynsHotDesk","status":true,"description":"Adds Receptionist actions: Charm Goblin and Strip Down.","parameters":{"name":"KarrynsHotDesk","displayedName":"Karryn's Hot Desk","version":"1.3.0"}}
// #MODS TXT LINES END

var KarrynsHotDesk = KarrynsHotDesk || {};

(function() {
    'use strict';

    var MOD_NAME = "Karryn's Hot Desk";
    var CHARM_GOBLIN_SKILL_ID = 9200;
    var STRIP_DOWN_SKILL_ID = 9201;
    var RECEPTIONIST_KICK_AWAY_SKILL_ID = 1596;
    var RECEPTIONIST_FIX_CLOTHES_SKILL_ID = 1597;
    var RECEPTIONIST_KICK_AWAY_LINE_ID = 7132;
    var DEBUG_LOG = false;

    var CHARM_ACTION_NAME = 'Charm Goblin';
    var CHARM_ACTION_DESC = 'Target a goblin behind Karryn and instantly start receptionist sex.';
    var STRIP_ACTION_NAME = 'Strip Down';
    var STRIP_ACTION_DESC = "Instantly remove all of Karryn's clothes and panties.";
    var pendingKickLogReplacementLines = 0;
    var CHARM_LOG_REPLACEMENT = "Karryn charms a goblin behind her into immediate sex!";

    try {

    var debugLog = function(text) {
        if (!DEBUG_LOG) return;
        console.log('[' + MOD_NAME + '] ' + text);
    };

    var isCharmSkillItem = function(item) {
        if (!item) return false;
        if (item.id === CHARM_GOBLIN_SKILL_ID) return true;
        if (item._hotDeskCharmSkill) return true;
        if (item.name === CHARM_ACTION_NAME) return true;
        if (typeof item.customAfterEval === 'string' &&
            item.customAfterEval.indexOf('afterEval_receptionistBattle_charmGoblin') >= 0) {
            return true;
        }
        return false;
    };

    var isCharmProxyKickAwayItem = function(item) {
        if (!item) return false;
        return pendingKickLogReplacementLines > 0 && item.id === RECEPTIONIST_KICK_AWAY_SKILL_ID;
    };

    var findTaggedSkillId = function(tagName) {
        if (typeof $dataSkills === 'undefined' || !$dataSkills) return 0;
        for (var i = 1; i < $dataSkills.length; i++) {
            var skill = $dataSkills[i];
            if (skill && skill[tagName]) return i;
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

        var taggedCharmId = findTaggedSkillId('_hotDeskCharmSkill');
        if (taggedCharmId) CHARM_GOBLIN_SKILL_ID = taggedCharmId;
        else if ($dataSkills[CHARM_GOBLIN_SKILL_ID] && !$dataSkills[CHARM_GOBLIN_SKILL_ID]._hotDeskCharmSkill) {
            CHARM_GOBLIN_SKILL_ID = findFreeSkillId(CHARM_GOBLIN_SKILL_ID + 1);
        }

        var taggedStripId = findTaggedSkillId('_hotDeskStripSkill');
        if (taggedStripId) STRIP_DOWN_SKILL_ID = taggedStripId;
        else {
            if (STRIP_DOWN_SKILL_ID === CHARM_GOBLIN_SKILL_ID) STRIP_DOWN_SKILL_ID++;
            if ($dataSkills[STRIP_DOWN_SKILL_ID] && !$dataSkills[STRIP_DOWN_SKILL_ID]._hotDeskStripSkill) {
                STRIP_DOWN_SKILL_ID = findFreeSkillId(STRIP_DOWN_SKILL_ID + 1);
            }
            if (STRIP_DOWN_SKILL_ID === CHARM_GOBLIN_SKILL_ID) {
                STRIP_DOWN_SKILL_ID = findFreeSkillId(CHARM_GOBLIN_SKILL_ID + 1);
            }
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

    var applyCharmEvalFields = function(skill) {
        skill.costShowEval = 'visible = this.showEval_receptionistBattle_charmGoblin();\n';
        skill.requireEval = 'value = this.customReq_receptionistBattle_charmGoblin();\n';
        skill.customBeforeEval = '';
        skill.customPreDamageEval = '';
        skill.customPostDamageEval = '';
        skill.customAfterEval = 'user.afterEval_receptionistBattle_charmGoblin(target);\n';
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

    var pickCharmSkillIdForced = function(goblin, actor) {
        if (!goblin || !actor) return 0;

        var pussyId = (typeof SKILL_ENEMY_POSEJOIN_RECEPTIONIST_PUSSY_ID !== 'undefined') ? SKILL_ENEMY_POSEJOIN_RECEPTIONIST_PUSSY_ID : 1731;
        var analId = (typeof SKILL_ENEMY_POSEJOIN_RECEPTIONIST_ANAL_ID !== 'undefined') ? SKILL_ENEMY_POSEJOIN_RECEPTIONIST_ANAL_ID : 1732;
        var cunniId = (typeof SKILL_ENEMY_POSEJOIN_RECEPTIONIST_CUNNI_ID !== 'undefined') ? SKILL_ENEMY_POSEJOIN_RECEPTIONIST_CUNNI_ID : 1730;

        if (typeof SKILL_ENEMY_POSEJOIN_RECEPTIONIST_PUSSY_ID !== 'undefined' &&
            typeof goblin.canInsertPussy === 'function' && goblin.canInsertPussy(actor)) {
            return pussyId;
        }
        if (typeof SKILL_ENEMY_POSEJOIN_RECEPTIONIST_ANAL_ID !== 'undefined' &&
            typeof goblin.canInsertAnal === 'function' && goblin.canInsertAnal(actor)) {
            return analId;
        }
        if (typeof SKILL_ENEMY_POSEJOIN_RECEPTIONIST_CUNNI_ID !== 'undefined' &&
            typeof goblin.canCunnilingus === 'function' && goblin.canCunnilingus(actor)) {
            return cunniId;
        }

        // Force a receptionist join skill even when strict condition checks fail.
        if (typeof $dataSkills !== 'undefined' && $dataSkills) {
            if ($dataSkills[pussyId]) return pussyId;
            if ($dataSkills[analId]) return analId;
            if ($dataSkills[cunniId]) return cunniId;
        }
        return 0;
    };

    var tryCharmGoblinInstantSex = function(actor, goblin) {
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

        var skillId = pickCharmSkillIdForced(selectedGoblin, actor);
        if (!skillId) {
            debugLog(CHARM_ACTION_NAME + ': no valid receptionist pose-join skill for current state.');
            return false;
        }

        pendingKickLogReplacementLines = 8;
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

        Game_Actor.prototype.showEval_receptionistBattle_stripDown = function() {
            return true;
        };

        Game_Actor.prototype.customReq_receptionistBattle_stripDown = function() {
            return true;
        };

        Game_Actor.prototype.skillCost_receptionistBattle_stripDown = function() {
            return 0;
        };

        Game_Actor.prototype.afterEval_receptionistBattle_stripDown = function() {
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

    var buildCharmGoblinSkillNote = function() {
        return [
            '<order:115>',
            '<Custom Show Eval>',
            'visible = this.showEval_receptionistBattle_charmGoblin();',
            '</Custom Show Eval>',
            '<Custom Requirement>',
            'value = this.customReq_receptionistBattle_charmGoblin();',
            '</Custom Requirement>',
            '<After Eval>',
            'user.afterEval_receptionistBattle_charmGoblin(target);',
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

        if ($dataSkills[CHARM_GOBLIN_SKILL_ID] && !$dataSkills[CHARM_GOBLIN_SKILL_ID]._hotDeskCharmSkill) return;

        var baseSkill = $dataSkills[RECEPTIONIST_KICK_AWAY_SKILL_ID];
        var charmSkill = $dataSkills[CHARM_GOBLIN_SKILL_ID] && $dataSkills[CHARM_GOBLIN_SKILL_ID]._hotDeskCharmSkill ?
            $dataSkills[CHARM_GOBLIN_SKILL_ID] :
            JSON.parse(JSON.stringify(baseSkill));

        applyCommonCustomSkillFields(charmSkill, CHARM_GOBLIN_SKILL_ID, CHARM_ACTION_NAME, CHARM_ACTION_DESC, 84);
        charmSkill.scope = 11;
        charmSkill.animationId = 0;
        charmSkill.effects = [];
        charmSkill.note = buildCharmGoblinSkillNote();
        clearSkillTags(charmSkill);
        applyCharmEvalFields(charmSkill);
        charmSkill._hotDeskCharmSkill = true;

        $dataSkills[CHARM_GOBLIN_SKILL_ID] = charmSkill;
    };

    var patchCharmGoblinExecution = function() {
        if (typeof Game_Action === 'undefined' || !Game_Action.prototype || typeof Game_Action.prototype.apply !== 'function') return;
        if (Game_Action.prototype._hotDeskCharmApplyPatched) return;
        Game_Action.prototype._hotDeskCharmApplyPatched = true;

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
                var success = tryCharmGoblinInstantSex(user, target || getAnyBehindGoblin());

                if (!success && typeof BattleManager !== 'undefined' && BattleManager && BattleManager._logWindow) {
                    BattleManager._logWindow.push('addText', CHARM_ACTION_NAME + ' failed.');
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
            originalSceneBattleStart.apply(this, arguments);
        };
    };

    var patchBattleLogKickLineFilter = function() {
        if (typeof Window_BattleLog === 'undefined' || !Window_BattleLog.prototype || typeof Window_BattleLog.prototype.addText !== 'function') return;
        if (Window_BattleLog.prototype._hotDeskKickLineFilterPatched) return;
        Window_BattleLog.prototype._hotDeskKickLineFilterPatched = true;

        if (typeof Window_BattleLog.prototype.push === 'function') {
            var originalPush = Window_BattleLog.prototype.push;
            Window_BattleLog.prototype.push = function(methodName) {
                if (methodName === 'addText' && arguments.length >= 2 && typeof arguments[1] === 'string') {
                    if (/Karryn\s+kicks\s+Karryn\s+away!/i.test(arguments[1])) {
                        arguments[1] = CHARM_LOG_REPLACEMENT;
                    }
                }
                return originalPush.apply(this, arguments);
            };
        }

        var originalAddText = Window_BattleLog.prototype.addText;
        Window_BattleLog.prototype.addText = function(text) {
            if (typeof text === 'string' && /Karryn\s+kicks\s+Karryn\s+away!/i.test(text)) {
                text = CHARM_LOG_REPLACEMENT;
            }

            if (pendingKickLogReplacementLines > 0 && typeof text === 'string') {
                if (/kicks .+ away/i.test(text)) {
                    pendingKickLogReplacementLines = 0;
                    originalAddText.call(this, CHARM_LOG_REPLACEMENT);
                    return;
                }
                pendingKickLogReplacementLines--;
            }
            originalAddText.call(this, text);
        };
    };

    var patchBattleLogDisplayAction = function() {
        if (typeof Window_BattleLog === 'undefined' || !Window_BattleLog.prototype || typeof Window_BattleLog.prototype.displayAction !== 'function') return;
        if (Window_BattleLog.prototype._hotDeskDisplayActionPatched) return;
        Window_BattleLog.prototype._hotDeskDisplayActionPatched = true;

        var originalDisplayAction = Window_BattleLog.prototype.displayAction;
        Window_BattleLog.prototype.displayAction = function(subject, item) {
            var isKickAwaySkill = item && item.id === RECEPTIONIST_KICK_AWAY_SKILL_ID;
            var isActorSubject = subject && typeof subject.isActor === 'function' && subject.isActor();
            var action = isActorSubject && typeof subject.currentAction === 'function' ? subject.currentAction() : null;
            var selfTargeted = action && typeof action.subject === 'function' && typeof action._targetIndex !== 'undefined' &&
                action._targetIndex === action.subject().index();

            // In the malformed charm flow, the action resolves as Kick Away targeting Karryn herself.
            // Replace only that specific log line with the custom charm line.
            if (isKickAwaySkill && isActorSubject && selfTargeted) {
                this.push('addText', CHARM_LOG_REPLACEMENT);
                return;
            }
            originalDisplayAction.apply(this, arguments);
        };
    };

    var patchActionRemLinesReplacement = function() {
        if (typeof BattleManager === 'undefined' || typeof BattleManager.actionRemLines !== 'function') return;
        if (BattleManager._hotDeskActionRemLinesPatched) return;
        BattleManager._hotDeskActionRemLinesPatched = true;

        var originalActionRemLines = BattleManager.actionRemLines;
        BattleManager.actionRemLines = function(lineType) {
            var kickLineId = (typeof KARRYN_LINE_RECEPTIONIST_KICK_AWAY !== 'undefined') ? KARRYN_LINE_RECEPTIONIST_KICK_AWAY : RECEPTIONIST_KICK_AWAY_LINE_ID;
            if (pendingKickLogReplacementLines > 0 && lineType === kickLineId) {
                pendingKickLogReplacementLines = 0;
                if (this._logWindow && typeof this._logWindow.displayRemLine === 'function') {
                    this._logWindow.displayRemLine(CHARM_LOG_REPLACEMENT);
                    return false;
                }
            }
            return originalActionRemLines.apply(this, arguments);
        };
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

    var ensureSkillLearned = function(actor, skillId) {
        if (!actor || typeof actor.learnSkill !== 'function') return;
        if (typeof actor.isLearnedSkill === 'function' && actor.isLearnedSkill(skillId)) return;
        if (Array.isArray(actor._skills) && actor._skills.indexOf(skillId) >= 0) return;
        actor.learnSkill(skillId);
    };

    var ensureCustomSkillsForKarryn = function() {
        if (typeof $gameActors === 'undefined' || !$gameActors || typeof $gameActors.actor !== 'function') return;
        var karrynActorId = typeof ACTOR_KARRYN_ID !== 'undefined' ? ACTOR_KARRYN_ID : 1;
        var karrynActor = $gameActors.actor(karrynActorId);
        ensureSkillLearned(karrynActor, CHARM_GOBLIN_SKILL_ID);
        ensureSkillLearned(karrynActor, STRIP_DOWN_SKILL_ID);
    };

    var patchSkillLearning = function() {
        if (typeof Game_Actor === 'undefined' || !Game_Actor.prototype) return;
        if (typeof Game_Actor.prototype.setupSkills !== 'function') return;

        var originalSetupSkills = Game_Actor.prototype.setupSkills;
        Game_Actor.prototype.setupSkills = function() {
            originalSetupSkills.apply(this, arguments);
            installCharmGoblinSkillData();
            installStripDownSkillData();
            ensureSkillLearned(this, CHARM_GOBLIN_SKILL_ID);
            ensureSkillLearned(this, STRIP_DOWN_SKILL_ID);
        };

        installCharmGoblinSkillData();
        installStripDownSkillData();
        ensureCustomSkillsForKarryn();
    };

    var patchSaveLoadLearning = function() {
        if (typeof DataManager === 'undefined') return;

        if (typeof DataManager.createGameObjects === 'function') {
            var originalCreateGameObjects = DataManager.createGameObjects;
            DataManager.createGameObjects = function() {
                originalCreateGameObjects.apply(this, arguments);
                installCharmGoblinSkillData();
                installStripDownSkillData();
                ensureCustomSkillsForKarryn();
            };
        }

        if (typeof DataManager.extractSaveContents === 'function') {
            var originalExtractSaveContents = DataManager.extractSaveContents;
            DataManager.extractSaveContents = function(contents) {
                originalExtractSaveContents.apply(this, arguments);
                installCharmGoblinSkillData();
                installStripDownSkillData();
                ensureCustomSkillsForKarryn();
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
            patchSkillLearning();
            patchSaveLoadLearning();
            debugLog('Receptionist action patches applied.');
        }
    } catch (err) {
        console.error('[' + MOD_NAME + '] Fatal init error.', err);
    }
})();
