/***************************************************************************
 *                   (C) Copyright 2003-2022 - Stendhal                    *
 ***************************************************************************
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU Affero General Public License as        *
 *   published by the Free Software Foundation; either version 3 of the    *
 *   License, or (at your option) any later version.                       *
 *                                                                         *
 ***************************************************************************/

import { ActiveEntity } from "./ActiveEntity";
import { Entity } from "./Entity";
import { MenuItem } from "../action/MenuItem";
import { Chat } from "../util/Chat";
import { Nature } from "../util/Nature";
import { Floater } from "../sprite/Floater";
import { TextSprite } from "../sprite/TextSprite";

declare var marauroa: any;
declare var stendhal: any;

// hair should not be drawn with hat indexes in this list
stendhal.HATS_NO_HAIR = [3, 4, 13, 992, 993, 994, 996, 997];
var HEALTH_BAR_HEIGHT = 6;


export class RPEntity extends ActiveEntity {

	override zIndex = 8000;
	drawY = 0;
	spritePath = "";
	titleStyle = "#FFFFFF";
	_target?: RPEntity;
	attackSprite: any = undefined; // TODO
	attackResult: any = undefined; // TODO
	dir = 3;
	titleTextSprite?: TextSprite;
	floaters: any[] = [];


	override set(key: string, value: any) {
		// Ugly hack to detect changes. The old value is no
		// longer available after super.set()
		let oldValue = this[key];

		super.set(key, value);
		if (key == "text") {
			this.say(value);
		} else if (["hp", "base_hp"].indexOf(key) !== -1) {
			this[key] = parseInt(value, 10);
			if (key === "hp" && oldValue != undefined) {
				this.onHPChanged(this[key] - oldValue);
			}
		} else if (key === "target") {
			if (this._target) {
				this._target.onAttackStopped(this);
			}
			this._target = marauroa.currentZone[value];
			if (this._target) {
				this._target.onTargeted(this);
			}
		} else if (key === "away") {
			this.addFloater("Away", "#ffff00");
		} else if (key === "grumpy") {
			this.addFloater("Grumpy", "#ffff00");
		} else if (key === "xp" && oldValue != undefined) {
			this.onXPChanged(this[key] - oldValue);
		} else if (["title", "name", "class", "type"].indexOf(key) >-1) {
			this.createTitleTextSprite();
		}
	}

	override unset(key: string) {
		if (key === "target" && this._target) {
			this._target.onAttackStopped(this);
			this._target = undefined;
		} else if (key === "away") {
			this.addFloater("Back", "#ffff00");
		} else if (key === "grumpy") {
			this.addFloater("Receptive", "#ffff00");
		}
		super.unset(key);
	}

	override isVisibleToAction(_filter: boolean) {
		return typeof(this["ghostmode"]) == "undefined" || marauroa.me && marauroa.me.isAdmin();
	}

	override buildActions(list: MenuItem[]) {
		super.buildActions(list);
		/*
		 * Menu is used to provide an alternate action for some entities (like
		 * puppies - and they should not be attackable).
		 *
		 * For now normally attackable entities get a menu only in Capture The
		 * Flag, and then they don't need attack. If that changes, this code
		 * will need to be adjusted.
		 */
		if (!this["menu"]) {
			if (marauroa.me._target === this) {
				list.push({
					title: "Stop attack",
					action: function(_entity: Entity) {
						var action = {
							"type": "stop",
							"zone": marauroa.currentZoneName,
							"attack": ""
						};
						marauroa.clientFramework.sendAction(action);
					}
				});
			} else if (this !== marauroa.me) {
				list.push({
					title: "Attack",
					type: "attack"
				});
			}
		}
		if (this != marauroa.me) {
			list.push({
				title: "Push",
				type: "push"
			});
		}
	}

	/**
	 * retrieves the entity's visible title
	 */
	getTitle() {
		return this["title"];
	}

	/**
	 * says a text
	 */
	override say(text: string) {
		if (!marauroa.me) {
			return;
		}
		if (marauroa.me.isInHearingRange(this)) {
			if (text.startsWith("^!me")) {
				Chat.log("emote", text.replace(/^!me/, this.getTitle()));
			} else {
				this.addSpeechBubble(text);
				Chat.log("normal", this.getTitle() + ": " + text);
			}
		}
	}

	addSpeechBubble(text: string) {
		stendhal.ui.gamewindow.addTextSprite({
			realText: (text.length > 30) ? (text.substring(0, 30) + "...") : text,
			timeStamp: Date.now(),
			entity: this,
			draw: function(ctx: CanvasRenderingContext2D) {
				var x = this.entity["_x"] * 32 + 32;
				var y = this.entity["_y"] * 32 - 16;

				ctx.lineWidth = 2;
				ctx.font = "14px Arial";
				ctx.fillStyle = '#ffffff';
				// get width of text
				var width = ctx.measureText(this.realText).width + 8;
				ctx.strokeStyle = "#000000";
				ctx.strokeRect(x, y - 15, width, 20);
				ctx.fillRect(x, y - 15, width, 20);

				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(x - 5, y + 8);
				ctx.lineTo(x + 1, y + 5);
				ctx.stroke();
				ctx.closePath();
				ctx.fill();

				ctx.fillStyle = "#000000";
				ctx.fillText(this.realText, x + 4, y);
				return Date.now() > this.timeStamp + 2000 + 20 * this.realText.length;
			}
		});
	}

	/**
	 * Checks if the entity should cast a shadow.
	 */
	public castsShadow(): boolean {
		return typeof(this["no_shadow"]) === "undefined";
	}

	drawMultipartOutfit(ctx: CanvasRenderingContext2D) {
		// layers in draw order
		var layers = [];

		var outfit: any = {};
		if ("outfit_ext" in this) {
			layers = ["body", "dress", "head", "mouth", "eyes", "mask", "hair", "hat", "detail"];

			for (const part of this["outfit_ext"].split(",")) {
				if (part.includes("=")) {
					var tmp = part.split("=");
					outfit[tmp[0]] = tmp[1];
				}
			}
		} else {
			layers = ["body", "dress", "head", "hair", "detail"];

			outfit["body"] = this["outfit"] % 100;
			outfit["dress"] = Math.floor(this["outfit"]/100) % 100;
			outfit["head"] = Math.floor(this["outfit"]/10000) % 100;
			outfit["hair"] = Math.floor(this["outfit"]/1000000) % 100;
			outfit["detail"] = Math.floor(this["outfit"]/100000000) % 100;
		}

		if (stendhal.config.gamescreen.shadows && this.castsShadow()) {
			// dressed entities should use 48x64 sprites
			// FIXME: this will not display correctly for horse outfit
			const shadow = stendhal.data.sprites.getShadow("48x64");

			if (typeof(shadow) !== "undefined") {
				// draw shadow below other layers
				this.drawSpriteImage(ctx, shadow);
			}
		}

		for (const layer of layers) {
			// hair is not drawn under certain hats/helmets
			if (layer == "hair" && stendhal.HATS_NO_HAIR.includes(parseInt(outfit["hat"]))) {
				continue;
			}

			if (layer in outfit) {
				const img = this.getOutfitPart(layer, outfit[layer]);
				if (img) {
					this.drawSpriteImage(ctx, img);
				}
			}
		}
	}

	/**
	 * Get an outfit part (Image or a Promise)
	 *
	 * @param {string}  part
	 * @param {Number} index
	 */
	getOutfitPart(part: string, index: number) {
		if (index < 0) {
			return null;
		}

		let n = "" + index;
		if (index < 10) {
			n = "00" + index;
		} else if(index < 100) {
			n = "0" + index;
		}
		const filename = "/data/sprites/outfit/" + part + "/" + n + ".png";
		const colors = this["outfit_colors"];
		let colorname;
		if (part === "body" || part === "head") {
			colorname = "skin";
		} else {
			colorname = part;
		}
		if (typeof(colors) !== "undefined" && (typeof(colors[colorname]) !== "undefined")) {
			return stendhal.data.sprites.getFiltered(filename, "trueColor", colors[colorname]);
		} else {
			return stendhal.data.sprites.get(filename);
		}
	}

	/**
	 * draw RPEntities
	 */
	override draw(ctx: CanvasRenderingContext2D) {
		if (typeof(this["ghostmode"]) != "undefined" && marauroa.me && !marauroa.me.isAdmin()) {
			return;
		}
		this.drawCombat(ctx);
		this.drawMain(ctx);
		this.drawAttack(ctx);
		this.drawStatusIcons(ctx);
	}

	drawMain(ctx: CanvasRenderingContext2D) {
		let filename;
		if (typeof(this["outfit"]) != "undefined" || typeof(this["outfit_ext"]) != "undefined") {
			this.drawMultipartOutfit(ctx);
		} else {
			filename = "/data/sprites/" + this.spritePath + "/" + this["class"];
			if (typeof(this["subclass"]) != "undefined") {
				filename = filename + "/" + this["subclass"];
			}

			// check for safe image
			if (!stendhal.config.gamescreen.blood && stendhal.data.sprites.hasSafeImage(filename)) {
				filename = filename + "-safe.png";
			} else {
				filename = filename + ".png";
			}

			let image = stendhal.data.sprites.get(filename);

			if (stendhal.config.gamescreen.shadows && this.castsShadow()) {
				// check for configured shadow style
				let shadow_style = this["shadow_style"];
				if (typeof(shadow_style) === "undefined") {
					// default to sprite dimensions
					shadow_style = (image.width / 3) + "x" + (image.height / 4);
				}

				const shadow = stendhal.data.sprites.getShadow(shadow_style);

				// draw shadow first
				if (typeof(shadow) !== "undefined") {
					this.drawSpriteImage(ctx, shadow);
				}
			}

			this.drawSpriteImage(ctx, image);
		}
	}

	drawStatusIcons(ctx: CanvasRenderingContext2D) {

		function _drawAnimatedIcon(icon: CanvasImageSource, delay: number, nFrames: number, xdim: number, ydim: number, x: number, y: number) {
			var frame = Math.floor(Date.now() / delay) % nFrames;
			ctx.drawImage(icon, frame * xdim, 0, xdim, ydim, x, y, xdim, ydim);
		}
		function drawAnimatedIcon(iconPath: string, delay: number, x: number, y: number) {
			var icon = stendhal.data.sprites.get(iconPath);
			var dim = icon.height;
			var nFrames = icon.width / dim;
			_drawAnimatedIcon(icon, delay, nFrames, dim, dim, x, y);
		}
		function drawAnimatedIconWithFrames(iconPath: string, nFrames: number, delay: number, x: number, y: number) {
			var icon = stendhal.data.sprites.get(iconPath);
			var ydim = icon.height;
			var xdim = icon.width / nFrames;
			_drawAnimatedIcon(icon, delay, nFrames, xdim, ydim, x, y);
		}

		var x = this["_x"] * 32 - 10;
		var y = (this["_y"] + 1) * 32;
		if (this.hasOwnProperty("choking")) {
			ctx.drawImage(stendhal.data.sprites.get("/data/sprites/ideas/choking.png"), x, y - 10);
		} else if (this.hasOwnProperty("eating")) {
			ctx.drawImage(stendhal.data.sprites.get("/data/sprites/ideas/eat.png"), x, y - 10);
		}
		// NPC and pet idea icons
		if (this.hasOwnProperty("idea")) {
			ctx.drawImage(stendhal.data.sprites.get("/data/sprites/ideas/" + this["idea"] + ".png"),
					x + 32 * this["width"], y - this["drawHeight"]);
		}
		if (this.hasOwnProperty("away")) {
			drawAnimatedIcon("/data/sprites/ideas/away.png", 1500, x + 32 * this["width"], y - this["drawHeight"]);
		}
		if (this.hasOwnProperty("grumpy")) {
			drawAnimatedIcon("/data/sprites/ideas/grumpy.png", 1000, x + 5, y - this["drawHeight"]);
		}
		if (this.hasOwnProperty("last_player_kill_time")) {
			drawAnimatedIconWithFrames("/data/sprites/ideas/pk.png", 12, 300, x, y - this["drawHeight"]);
		}
		if (this.hasOwnProperty("poisoned")) {
			drawAnimatedIcon("/data/sprites/status/poison.png", 100, x + 32 * this["width"] - 10, y - this["drawHeight"]);
		}
		// NPC job icons
		if (this.hasOwnProperty("job_healer")) {
			ctx.drawImage(stendhal.data.sprites.get("/data/sprites/status/healer.png"), x, y - 10);
		}
		if (this.hasOwnProperty("job_merchant")) {
			ctx.drawImage(stendhal.data.sprites.get("/data/sprites/status/merchant.png"), x + 12, y - 10);
		}
	}

	/**
	 * Draw colored ellipses (or rectangles on browsers that do not support
	 * ellipses) when the entity is being attacked, or is attacking the user.
	 */
	drawCombat(ctx: CanvasRenderingContext2D) {
		if (this.attackers && this.attackers.size > 0) {
			ctx.lineWidth = 1;
			/*
			 * As of 2015-9-15 CanvasRenderingContext2D.ellipse() is not
			 * supported in most browsers. Fall back to rectangles on these.
			 * Also on Chrome 45.0.2454.85 ellipse() does not seem to support
			 * the begin angle parameter correctly, nor does the stroke
			 * direction work as it should so it can't be used as a workaround.
			 * Currently the second ellipse part is drawn as a full ellipse, but
			 * the code below should eventually draw the right thing once
			 * browsers catch up. Probably.
			 */
			if (ctx.ellipse instanceof Function) {
				var xRad = this["width"] * 16;
				var yRad = this["height"] * 16 / Math.SQRT2;
				var centerX = this["_x"] * 32 + xRad;
				var centerY = (this["_y"] + this["height"]) * 32 - yRad;
				ctx.strokeStyle = "#4a0000";
				ctx.beginPath();
				ctx.ellipse(centerX, centerY, xRad, yRad, 0, 0, Math.PI, false);
				ctx.stroke();
				ctx.strokeStyle = "#e60a0a";
				ctx.beginPath();
				ctx.ellipse(centerX, centerY, xRad, yRad, 0, Math.PI, 2 * Math.PI, false);
				ctx.stroke();
			} else {
				ctx.strokeStyle = "#e60a0a";
				ctx.strokeRect(32 * this["_x"], 32 * this["_y"], 32 * this["width"], 32 * this["height"]);
			}
		}
		if (this.getAttackTarget() === marauroa.me) {
			ctx.lineWidth = 1;
			// See above about ellipses.
			if (ctx.ellipse instanceof Function) {
				var xRad = this["width"] * 16 - 1;
				var yRad = this["height"] * 16 / Math.SQRT2 - 1;
				var centerX = this["_x"] * 32 + xRad + 1;
				var centerY = (this["_y"] + this["height"]) * 32 - yRad - 1;
				ctx.strokeStyle = "#ffc800";
				ctx.beginPath();
				ctx.ellipse(centerX, centerY, xRad, yRad, 0, 0, Math.PI, false);
				ctx.stroke();
				ctx.strokeStyle = "#ffdd0a";
				ctx.beginPath();
				ctx.ellipse(centerX, centerY, xRad, yRad, 0, Math.PI, 2 * Math.PI, false);
				ctx.stroke();
			} else {
				ctx.strokeStyle = "#ffdd0a";
				ctx.strokeRect(32 * this["_x"] + 1, 32 * this["_y"] + 1, 32 * this["width"] - 2, 32 * this["height"] - 2);
			}
		}
		if (this.attackResult) {
			if (this.attackResult.draw(ctx, (this["_x"] + this["width"]) * 32 - 10, (this["_y"] + this["height"]) * 32 - 10)) {
				this.attackResult = undefined;
			}
		}
	}

	/**
	 * Draw entities in this.floaters array. Each floater should have
	 * draw(ctx, x, y) method, where ctx is the canvas context, and x, y are
	 * the coordinates where to start floating. The method should return true
	 * when the floater should be removed.
	 */
	drawFloaters(ctx: CanvasRenderingContext2D) {
		var centerX = (this["_x"] + this["width"] / 2) * 32;
		var topY = (this["_y"] + 1) * 32 - this["drawHeight"];
		// Grab an unchanging copy
		var currentFloaters = this.floaters;
		for (var i = 0; i < currentFloaters.length; i++) {
			var floater = currentFloaters[i];
			if (floater.draw(ctx, centerX, topY)) {
				// copy the array and remove the specific element from the copy
				this.floaters = this.floaters.slice();
				this.floaters.splice(this.floaters.indexOf(floater), 1);
			}
		}
	}

	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {Image} image
	 */
	drawSpriteImage(ctx: CanvasRenderingContext2D, image: CanvasImageSource) {
		var localX = this["_x"] * 32;
		var localY = this["_y"] * 32;
		if (image.height) { // image.complete is true on missing image files
			var nFrames = 3;
			var nDirections = 4;
			var yRow = this["dir"] - 1;
			var frame = 1; // draw center column when idle
			// Ents are a hack in Java client too
			if (this["class"] == "ent") {
				nFrames = 1;
				nDirections = 2;
				yRow = Math.floor((this["dir"] - 1) / 2);
				frame = 0;
			}
			this["drawHeight"] = image.height as number / nDirections;
			this["drawWidth"] = image.width as number / nFrames;
			var drawX = ((this["width"] * 32) - this["drawWidth"]) / 2;
			if (this["speed"] > 0 && nFrames != 1) {
				var animLength = nFrames * 2 - 2;
				// % Works normally with *floats* (just whose bright idea was
				// that?), so use floor() as a workaround
				frame = Math.floor(Date.now() / 100) % animLength;
				if (frame >= nFrames) {
					frame = animLength - frame;
				}
			}
			var drawY = (this["height"] * 32) - this["drawHeight"];
			ctx.drawImage(image, frame * this["drawWidth"], yRow * this["drawHeight"], this["drawWidth"], this["drawHeight"], localX + drawX, localY + drawY, this["drawWidth"], this["drawHeight"]);
		}
	}

	drawTop(ctx: CanvasRenderingContext2D) {
		var localX = this["_x"] * 32;
		var localY = this["_y"] * 32;

		this.drawFloaters(ctx);
		this.drawHealthBar(ctx, localX, localY);
		this.drawTitle(ctx, localX, localY);
	}

	drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number) {
		var drawX = x + ((this["width"] * 32) - this["drawWidth"]) / 2;
		var drawY = y + (this["height"] * 32) - this["drawHeight"] - HEALTH_BAR_HEIGHT;

		ctx.strokeStyle = "#000000";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.rect(drawX, drawY, this["drawWidth"], HEALTH_BAR_HEIGHT - 2);
		ctx.stroke();

		ctx.fillStyle = "#E0E0E0";
		ctx.fillRect(drawX, drawY, this["drawWidth"], HEALTH_BAR_HEIGHT - 2);

		// Bar color
		var hpRatio = this["hp"] / this["base_hp"];
		var red = Math.floor(Math.min((1 - hpRatio) * 2, 1) * 255);
		var green = Math.floor(Math.min(hpRatio * 2, 1) * 255);
		ctx.fillStyle = "rgb(" + red + "," + green + ", 0)";
		ctx.fillRect(drawX, drawY, this["drawWidth"] * hpRatio, HEALTH_BAR_HEIGHT - 2);
	}

	createTitleTextSprite() {
		let title = this.getTitle();
		if (!title) {
			title = this["_name"];
			if (!title) {
				title = this["class"];
				if (!title) {
					title = this["type"];
				}
			}
		}

		if (title) {
			this.titleTextSprite = new TextSprite(title, this.titleStyle, "14px sans-serif");
		}
	}

	drawTitle(ctx: CanvasRenderingContext2D, x: number, y: number) {
		if (this.titleTextSprite) {
			let textMetrics = this.titleTextSprite.getTextMetrics(ctx);
			var drawY = y + (this["height"] * 32) - this["drawHeight"] - HEALTH_BAR_HEIGHT;
			this.titleTextSprite.draw(ctx, x + (this["width"] * 32 - textMetrics.width) / 2, drawY - 5 - HEALTH_BAR_HEIGHT);
		}
	}

	drawAttack(ctx: CanvasRenderingContext2D) {
		if (this.attackSprite == null) {
			return;
		}
		if (this.attackSprite.expired()) {
			this.attackSprite = null;
			return;
		}
		var localX = this["_x"] * 32;
		var localY = this["_y"] * 32;
		this.attackSprite.draw(ctx, localX, localY, this["drawWidth"], this["drawHeight"]);
	}

	// attack handling
	getAttackTarget() {
		// If the attack target id was read before the target was available,
		// _target does not point to the correct entity. Look up the target
		// again, if _target does not exist, but it should.
		if (!this._target && this["target"]) {
			this._target = marauroa.currentZone[this["target"]];
			if (this._target) {
				this._target.onTargeted(this);
			}
		}
		return this._target;
	}

	onDamaged(_source: Entity, damage: number) {
		this.attackResult = this.createResultIcon("/data/sprites/combat/hitted.png");
		var sounds = ["attack-melee-01", "attack-melee-02", "attack-melee-03", "attack-melee-04", "attack-melee-05", "attack-melee-06", "attack-melee-07"];
		var index = Math.floor(Math.random() * Math.floor(sounds.length));
		stendhal.ui.sound.playLocalizedEffect(this["_x"], this["_y"], 20, 3, sounds[index], 1);
	}

	onBlocked(_source: Entity) {
		this.attackResult = this.createResultIcon("/data/sprites/combat/blocked.png");
		var sounds = ["clang-metallic-1", "clang-dull-1"];
		var index = Math.floor(Math.random() * Math.floor(sounds.length));
		stendhal.ui.sound.playLocalizedEffect(this["_x"], this["_y"], 20, 3, sounds[index], 1);
	}

	onMissed(_source: Entity) {
		this.attackResult = this.createResultIcon("/data/sprites/combat/missed.png");
	}

	onHPChanged(change: number) {
		if (change > 0) {
			this.addFloater("+" + change, "#00ff00");
		} else if (change < 0) {
			this.addFloater(change.toString(), "#ff0000");
		}
	}

	onXPChanged(change: number) {
		if (change > 0) {
			this.addFloater("+" + change, "#4169e1");
			Chat.log("significant_positive", this.getTitle() + " earns " + change + " experience points.");
		} else if (change < 0) {
			this.addFloater(change.toString(), "#ff8f8f");
			Chat.log("significant_negative", this.getTitle() + " loses " + Math.abs(change) + " experience points.");
		}
	}

	addFloater(message: string, color: string) {
		this.floaters.push(new Floater(message, color));
	}

	/**
	 * Create a closure for drawing attack result icons. The resulting object
	 * has a method draw(context, x, y) which returns true when the attack
	 * result has expired and draw() should no longer be called.
	 *
	 * @param imagePath path to the result icon
	 * @return object for drawing the icon
	 */
	createResultIcon(imagePath: string) {
		return {
			initTime: Date.now(),
			image: stendhal.data.sprites.get(imagePath),
			draw: function(ctx: CanvasRenderingContext2D, x: number, y: number) {
				ctx.drawImage(this.image, x, y);
				return (Date.now() - this.initTime > 1200);
			}
		};
	}

	onAttackPerformed(nature: number, ranged: boolean) {
		if (ranged) {
			let color = Nature.VALUES[nature].color;
			var tgt = this.getAttackTarget()!;
			this.attackSprite = (function(color, targetX, targetY) {
				return {
					initTime: Date.now(),
					expired: function() {
						return Date.now() - this.initTime > 180;
					},
					draw: function(ctx: CanvasRenderingContext2D, x: number, y: number, entityWidth: number, entityHeight: number) {
						var dtime = Date.now() - this.initTime;
						// We can use fractional "frame" for the lines. Just
						// draw the arrow where it should be at the moment.
						var frame = Math.min(dtime / 60, 4);

						var startX = x + entityWidth / 4;
						var startY = y + entityHeight / 4;

						var yLength = (targetY - startY) / 4;
						var xLength = (targetX - startX) / 4;

						startY += frame * yLength;
						var endY = startY + yLength;
						startX += frame * xLength;
						var endX = startX + xLength;

						ctx.strokeStyle = color;
						ctx.lineWidth = 2;
						ctx.moveTo(startX, startY);
						ctx.lineTo(endX, endY);
						ctx.stroke();
					}
				};
			})(color, (tgt.x + tgt.width / 2) * 32, (tgt.y + tgt.height / 2) * 32);
		} else {
			let imagePath = Nature.VALUES[nature].imagePath;
			this.attackSprite = (function(imagePath, _ranged, dir) {
				return {
					initTime: Date.now(),
					image: stendhal.data.sprites.get(imagePath),
					frame: 0,
					expired: function() {
						return Date.now() - this.initTime > 180;
					},
					draw: function(ctx: CanvasRenderingContext2D, x: number, y: number, entityWidth: number, entityHeight: number) {
						if (!this.image.height) {
							return;
						}
						var yRow = dir - 1;
						var drawHeight = this.image.height / 4;
						var drawWidth = this.image.width / 3;
						var dtime = Date.now() - this.initTime;
						var frame = Math.floor(Math.min(dtime / 60, 3));
						var centerX = x + (entityWidth - drawWidth) / 2;
						var centerY = y + (entityHeight - drawHeight) / 2;
						ctx.drawImage(this.image, frame * drawWidth, yRow * drawHeight,
								drawWidth, drawHeight, centerX, centerY, drawWidth, drawHeight);
					}
				};
			})(imagePath, ranged, this["dir"]);
		}
	}

	/**
	 * Called when this entity is selected as the attack target.
	 *
	 * @param attacked The entity that selected this as the target
	 */
	onTargeted(attacker: Entity) {
		if (!this.attackers) {
			this.attackers = { size: 0 };
		}
		if (!(attacker["id"] in this.attackers)) {
			this.attackers[attacker["id"]] = true;
			this.attackers.size += 1;
		}
	}

	/**
	 * Called when an entity deselects this as its attack target.
	 *
	 * @param attacker The entity that had this as the attack target, but
	 * 	stopped attacking
	 */
	onAttackStopped(attacker: Entity) {
		if (attacker["id"] in this.attackers) {
			delete this.attackers[attacker["id"]];
			this.attackers.size -= 1;
		}
	}

	override destroy(_obj: Entity) {
		if (this._target) {
			this._target.onAttackStopped(this);
		}
	}
}
