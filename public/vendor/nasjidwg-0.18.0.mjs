//#region node_modules/nasjidwg/dist/core/color.js
var e = [
	0,
	16711680,
	16776960,
	65280,
	65535,
	255,
	16711935,
	16777215,
	8421504,
	12632256,
	16711680,
	16744319,
	10813440,
	10834514,
	8323072,
	8339263,
	4980736,
	4990502,
	2490368,
	2495251,
	16727808,
	16752511,
	10823936,
	10839890,
	8331008,
	8343359,
	4985600,
	4992806,
	2492672,
	2496275,
	16744192,
	16760703,
	10834432,
	10845266,
	8339200,
	8347455,
	4990464,
	4995366,
	2495232,
	2497555,
	16760576,
	16768895,
	10845184,
	10850642,
	8347392,
	8351551,
	4995328,
	4997670,
	2497536,
	2498835,
	16776960,
	16777087,
	10855680,
	10855762,
	8355584,
	8355647,
	5000192,
	5000230,
	2500096,
	2500115,
	12582656,
	14679935,
	8168704,
	9545042,
	6258432,
	7307071,
	3755008,
	4344870,
	1844736,
	2172435,
	8388352,
	12582783,
	5416192,
	8168786,
	4161280,
	6258495,
	2509824,
	3755046,
	1254912,
	1844755,
	4194048,
	10485631,
	2729216,
	6792530,
	2064128,
	5209919,
	1264640,
	3099686,
	599552,
	1517075,
	65280,
	8388479,
	42240,
	5416274,
	32512,
	4161343,
	19456,
	2509862,
	9728,
	1254931,
	65343,
	8388511,
	42281,
	5416295,
	32543,
	4161359,
	19475,
	2509871,
	9737,
	1267735,
	65407,
	8388543,
	42322,
	5416316,
	32575,
	4161375,
	19494,
	2509881,
	9747,
	1267740,
	65471,
	8388575,
	42364,
	5416337,
	32607,
	4161391,
	19513,
	2509890,
	9756,
	1267800,
	65535,
	8388607,
	42405,
	5416357,
	32639,
	4161407,
	19532,
	2509900,
	9766,
	1267800,
	49151,
	8380415,
	31909,
	5411237,
	24447,
	4157311,
	14668,
	2507390,
	7206,
	1267800,
	32767,
	8372223,
	21157,
	5405861,
	16255,
	4153215,
	9804,
	2505086,
	4902,
	1252440,
	16383,
	8364031,
	10661,
	5400485,
	8063,
	4149119,
	4940,
	2502526,
	2342,
	1251160,
	255,
	8355839,
	165,
	5395109,
	127,
	4145023,
	76,
	2500222,
	38,
	1250136,
	4129023,
	10452991,
	2687141,
	6771365,
	2031743,
	5193599,
	1245260,
	3090046,
	589862,
	1512280,
	8323327,
	12550143,
	5374117,
	8147621,
	4128895,
	6242175,
	2490444,
	3745406,
	1245222,
	1839960,
	12517631,
	14647295,
	8126629,
	9523877,
	6226047,
	7290751,
	3735628,
	4335180,
	1835046,
	5772120,
	16711935,
	16744447,
	10813605,
	10834597,
	8323199,
	8339327,
	4980812,
	4990540,
	2490406,
	5772120,
	16711871,
	16744415,
	10813564,
	10834577,
	8323167,
	8339311,
	4980793,
	4990530,
	2490396,
	5772120,
	16711807,
	16744383,
	10813522,
	10834556,
	8323135,
	8339295,
	4980774,
	4990521,
	2490387,
	5772060,
	16711743,
	16744351,
	10813481,
	10834535,
	8323103,
	8339279,
	4980755,
	4990511,
	2490377,
	5772055,
	0,
	6645093,
	6710886,
	10066329,
	13421772,
	16777215
], t = (t) => {
	let n = t >> 16 & 255, r = t >> 8 & 255, i = t & 255, a = 7, o = Infinity;
	for (let t = 1; t <= 255; t++) {
		let s = e[t], c = n - (s >> 16 & 255), l = r - (s >> 8 & 255), u = i - (s & 255), d = c * c + l * l + u * u;
		if (d < o && (o = d, a = t, d === 0)) break;
	}
	return a;
}, n = 32768, r = 128;
function i(e, t, i) {
	let a = e.length, o = new Int32Array(n).fill(-1), s = new Int32Array(Math.max(1, a)).fill(-1), c = (t) => Math.imul(e[t] << 16 | e[t + 1] << 8 | e[t + 2], 2654435761) >>> 17, l = (e) => {
		let t = c(e);
		s[e] = o[t], o[t] = e;
	}, u = 0, d = 0;
	for (; d < a;) {
		let n = 0, f = 0;
		if (d >= t.firstMatchAt && d + 3 <= a) {
			let i = Math.min(t.maxLength, a - d), l = o[c(d)];
			for (let a = r; l >= 0 && a > 0; a--, l = s[l]) {
				let r = d - l;
				if (r > t.maxDistance) break;
				if (n > 0 && e[l + n] !== e[d + n]) continue;
				let a = 0;
				for (; a < i && e[l + a] === e[d + a];) a++;
				let o = r > t.shortMatchMaxDistance ? 4 : 3;
				if (a >= o && a > n && (n = a, f = r, a >= i)) break;
			}
		}
		if (n > 0) {
			i(u, d, n, f);
			let e = d + n, t = Math.min(e, a - 2);
			for (; d < t; d++) l(d);
			d = e, u = e;
		} else d + 3 <= a && l(d), d++;
	}
	i(u, a, 0, 0);
}
var a = {
	firstMatchAt: 4,
	maxDistance: 49151,
	maxLength: 2147483647,
	shortMatchMaxDistance: 16384
};
function o(e) {
	let t = e.length >= 4 ? e : (() => {
		let t = /* @__PURE__ */ new Uint8Array(4);
		return t.set(e), t;
	})(), n = [], r = -1, o = (e) => {
		let t = e;
		for (; t > 255;) n.push(0), t -= 255;
		n.push(t);
	}, s = (e, i) => {
		let a = i - e;
		if (a !== 0) {
			r >= 0 && a <= 3 ? n[r] |= a : a <= 18 ? n.push(a - 3) : (n.push(0), o(a - 18));
			for (let r = e; r < i; r++) n.push(t[r]);
		}
	}, c = (e, t) => {
		if (e <= 14 && t <= 1024) r = n.length, n.push(e + 1 << 4 | (t - 1 & 3) << 2, t - 1 >> 2);
		else if (t <= 16384) e <= 33 ? n.push(32 | e - 2) : (n.push(32), o(e - 33)), r = n.length, n.push((t - 1 & 63) << 2, t - 1 >> 6);
		else {
			let i = t >= 32768 ? 8 : 0, a = t - (i === 0 ? 16384 : 32768);
			e <= 9 ? n.push(16 | i | e - 2) : (n.push(16 | i), o(e - 9)), r = n.length, n.push((a & 63) << 2, a >> 6);
		}
	};
	return i(t, a, (e, t, n, r) => {
		s(e, t), n > 0 && c(n, r);
	}), n.push(17, 0, 0), Uint8Array.from(n);
}
//#endregion
//#region node_modules/nasjidwg/dist/dwg/sections2007.js
var s = (/* @__PURE__ */ ".0.10.210.0123.40123.512340.6512340.01234567.801234567.9123456780.a9123456780.89ab01234567.c89ab01234567.d9abc123456780.ed9abc123456780.89abcdef01234567.9abcdefg801234567.h9abcdefg123456780.ihg89abcdef01234567.ghij89abcdef01234567.kghij89abcdef01234567.lkghij89abcdef01234567.mlkghij89abcdef01234567.ghijklmn89abcdef01234567.hijklmnog89abcdef01234567.phijklmnog89abcdef01234567.qphijklmnog89abcdef01234567.opqrghijklmn89abcdef01234567.sopqrghijklmn89abcdef01234567.tsopqrghijklmn89abcdef01234567.uqrstijklmnopabcdefgh2345678910".split(".")).map((e) => Uint8Array.from([...e], (e) => parseInt(e, 32))), c = {
	firstMatchAt: 8,
	maxDistance: 65535,
	maxLength: 65791,
	shortMatchMaxDistance: 8192
};
function l(e) {
	let t = e.length >= 8 ? e : (() => {
		let t = /* @__PURE__ */ new Uint8Array(8);
		return t.set(e), t;
	})(), n = [], r = -1, a = (e, r) => {
		let i = e, a = r;
		for (; a >= 32;) {
			for (let e = 24; e >= 0; e -= 8) for (let r = 0; r < 8; r++) n.push(t[i + e + r]);
			i += 32, a -= 32;
		}
		if (a > 0) {
			let e = s[a], r = new Uint8Array(a);
			for (let n = 0; n < a; n++) r[e[n]] = t[i + n];
			for (let e = 0; e < a; e++) n.push(r[e]);
		}
	}, o = (e, t) => {
		let i = t - e;
		if (i !== 0) {
			if (r >= 0 && i <= 7) n[r] |= i;
			else if (i <= 22) n.push(i - 8);
			else {
				n.push(15);
				let e = i - 23;
				if (e < 255) n.push(e);
				else for (n.push(255), e -= 255;;) {
					let t = Math.min(e, 65535);
					if (n.push(t & 255, t >> 8), e -= t, t !== 65535) break;
				}
			}
			a(e, i);
		}
	}, l = (e, t, i) => {
		if (t <= 512 && (e <= 14 || e === 15 && i)) n.push(e << 4 | t - 1 & 15), r = n.length, n.push(t - 1 >> 4 << 3);
		else if (e <= 18 && t <= 8192) n.push(16 | e - 3, t - 1 & 255), r = n.length, n.push(t - 1 >> 8 << 3);
		else if (e >= 19 && e <= 50 && t <= 4096) {
			let a = e - 19;
			n.push((i ? 0 : 240) | a & 15, t - 1 & 255), r = n.length, n.push((t - 1 >> 8 & 15) << 3 | (a >= 16 ? 128 : 0));
		} else if (e <= 255) n.push(32 | e & 7, t & 255, t >> 8), r = n.length, n.push(e & 248);
		else {
			let i = e - 256;
			n.push(40 | i & 7, t - 1 & 255, t - 1 >> 8, i >> 3 & 255), r = n.length, n.push(i >> 11 << 3);
		}
	};
	return i(t, c, (e, t, n, r) => {
		o(e, t), n > 0 && l(n, r, t > e);
	}), Uint8Array.from(n);
}
//#endregion
//#region node_modules/nasjidwg/dist/text/arabic.js
var u = {};
[
	[1574, 65161],
	[1576, 65167],
	[1578, 65173],
	[1579, 65177],
	[1580, 65181],
	[1581, 65185],
	[1582, 65189],
	[1587, 65201],
	[1588, 65205],
	[1589, 65209],
	[1590, 65213],
	[1591, 65217],
	[1592, 65221],
	[1593, 65225],
	[1594, 65229],
	[1601, 65233],
	[1602, 65237],
	[1603, 65241],
	[1604, 65245],
	[1605, 65249],
	[1606, 65253],
	[1607, 65257],
	[1610, 65265]
].forEach(([e, t]) => {
	u[e] = [
		t,
		t + 1,
		t + 2,
		t + 3
	];
}), [
	[1570, 65153],
	[1571, 65155],
	[1572, 65157],
	[1573, 65159],
	[1575, 65165],
	[1577, 65171],
	[1583, 65193],
	[1584, 65195],
	[1585, 65197],
	[1586, 65199],
	[1608, 65261],
	[1609, 65263]
].forEach(([e, t]) => {
	u[e] = [t, t + 1];
}), u[1569] = [65152], u[1600] = [
	1600,
	1600,
	1600,
	1600
];
var d = {
	1570: [65269, 65270],
	1571: [65271, 65272],
	1573: [65273, 65274],
	1575: [65275, 65276]
}, f = (e) => e >= 1611 && e <= 1631 || e === 1648, p = (e) => {
	if (!/[ء-ي]/.test(e)) return e;
	let t = Array.from(String(e)), n = [], r = !1;
	for (let e = 0; e < t.length; e++) {
		let i = t[e].codePointAt(0);
		if (f(i)) {
			n.push(t[e]);
			continue;
		}
		let a = u[i];
		if (!a) {
			n.push(t[e]), r = !1;
			continue;
		}
		if (i === 1604 && e + 1 < t.length) {
			let i = d[t[e + 1].codePointAt(0)];
			if (i) {
				n.push(String.fromCharCode(r ? i[1] : i[0])), e++, r = !1;
				continue;
			}
		}
		let o = a.length === 4, s = !1;
		for (let n = e + 1; n < t.length; n++) {
			let e = t[n].codePointAt(0);
			if (f(e)) continue;
			let r = u[e];
			s = !!(r && r.length >= 2);
			break;
		}
		let c = o && s ? r ? 3 : 2 : +!!r;
		n.push(String.fromCharCode(a[Math.min(c, a.length - 1)])), r = o && s;
	}
	return n.join("");
}, m = {};
for (let e of Object.keys(u)) {
	let t = Number(e);
	for (let e of u[t]) e !== 1600 && (m[e] = String.fromCharCode(t));
}
for (let e of Object.keys(d)) {
	let t = Number(e);
	for (let e of d[t]) m[e] = "ل" + String.fromCharCode(t);
}
var h = {
	"(": ")",
	")": "(",
	"[": "]",
	"]": "[",
	"{": "}",
	"}": "{",
	"<": ">",
	">": "<"
}, g = (e) => e >= 1536 && e <= 1791 || e >= 64336 && e <= 65276 ? "R" : e >= 65 && e <= 90 || e >= 97 && e <= 122 ? "L" : null, _ = (e, t) => {
	if (!/[()[\]{}<>]/.test(e)) return e;
	let n = null;
	for (let t of e) if (n = g(t.codePointAt(0)), n) break;
	if (n !== "R") return e;
	let r = t ? ")]}>" : "([{<", i = t ? "([{<" : ")]}>", a = Array.from(e), o = [];
	for (let e = 0; e < a.length; e++) {
		if (r.indexOf(a[e]) >= 0) {
			o.push(e);
			continue;
		}
		if (i.indexOf(a[e]) >= 0 && o.length) {
			let t = o.pop(), n = !1;
			for (let r = t + 1; r < e && !n; r++) n = g(a[r].codePointAt(0)) === "R";
			n && (a[t] = h[a[t]], a[e] = h[a[e]]);
		}
	}
	return a.join("");
}, v = (e, t = !1) => e.split("\n").map((e) => _(e, t)).join("\n"), y = (e) => /[֐-ࣿיִ-ﻼ]/.test(e), b = (e) => String(e ?? "").replace(/°/g, "%%d").replace(/Ø/g, "%%c").replace(/±/g, "%%p"), x = /* @__PURE__ */ new WeakMap(), S = null, C = null, ee = (e) => {
	let t = e.buffer;
	if (t === S && C) return C;
	let n = x.get(t);
	return n || x.set(t, n = new DataView(t)), S = t, C = n, n;
}, te = class {
	data;
	pos = 0;
	endBit;
	scratch;
	sBytes;
	sF64;
	view;
	base;
	constructor(e, t = 0, n) {
		this.data = e, this.pos = t, this.endBit = n ?? e.length * 8, this.view = ee(e), this.base = e.byteOffset;
	}
	atEnd() {
		return this.pos >= this.endBit;
	}
	need(e) {
		if (this.pos + e > this.endBit) throw RangeError(`bit stream overrun: need ${e} bits at ${this.pos}, end ${this.endBit}`);
	}
	b() {
		this.need(1);
		let e = this.data[this.pos >> 3] >> 7 - (this.pos & 7) & 1;
		return this.pos++, e;
	}
	bb() {
		let e = this.pos;
		e + 2 > this.endBit && this.need(2);
		let t = e >> 3, n = e & 7;
		return this.pos = e + 2, n < 7 ? this.data[t] >> 6 - n & 3 : (this.data[t] & 1) << 1 | (this.data[t + 1] ?? 0) >> 7;
	}
	bbb() {
		return this.bb() << 1 | this.b();
	}
	rc() {
		this.need(8);
		let e = this.pos >> 3, t = this.pos & 7, n;
		return n = t === 0 ? this.data[e] : (this.data[e] << t | (this.data[e + 1] ?? 0) >> 8 - t) & 255, this.pos += 8, n;
	}
	bytes(e) {
		let t = new Uint8Array(e);
		if (this.pos & 7) for (let n = 0; n < e; n++) t[n] = this.rc();
		else {
			this.need(e * 8);
			let n = this.pos >> 3;
			t.set(this.data.subarray(n, n + e)), this.pos += e * 8;
		}
		return t;
	}
	rs() {
		if (!(this.pos & 7)) {
			this.need(16);
			let e = this.pos >> 3;
			return this.pos += 16, this.data[e] | this.data[e + 1] << 8;
		}
		return this.rc() | this.rc() << 8;
	}
	rl() {
		if (!(this.pos & 7)) {
			this.need(32);
			let e = this.pos >> 3;
			return this.pos += 32, (this.data[e] | this.data[e + 1] << 8 | this.data[e + 2] << 16 | this.data[e + 3] << 24) >>> 0;
		}
		return (this.rs() | this.rs() << 16) >>> 0;
	}
	rll() {
		return this.rl() + this.rl() * 4294967296;
	}
	rd() {
		let e = this.pos;
		if (e + 64 > this.endBit && this.need(64), !(e & 7)) return this.pos = e + 64, this.view.getFloat64(this.base + (e >> 3), !0);
		let t = this.scratch ??= /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8)), n = this.base + (e >> 3), r = e & 7, i = 32 - r;
		if (n + 12 <= this.view.byteLength) {
			let a = this.view, o = a.getUint32(n, !1), s = a.getUint32(n + 4, !1), c = a.getUint32(n + 8, !1);
			return t.setUint32(0, (o << r | s >>> i) >>> 0, !1), t.setUint32(4, (s << r | c >>> i) >>> 0, !1), this.pos = e + 64, t.getFloat64(0, !0);
		}
		let a = this.data, o = e >> 3, s = 8 - r, c = this.sBytes;
		if (!c) {
			let e = /* @__PURE__ */ new ArrayBuffer(8);
			c = this.sBytes = new Uint8Array(e), this.sF64 = new Float64Array(e);
		}
		for (let e = 0; e < 8; e++) c[e] = (a[o + e] << r | a[o + e + 1] >> s) & 255;
		return this.pos = e + 64, this.sF64[0];
	}
	bs() {
		switch (this.bb()) {
			case 0: {
				let e = this.rs();
				return e >= 32768 ? e - 65536 : e;
			}
			case 1: return this.rc();
			case 2: return 0;
			default: return 256;
		}
	}
	bl() {
		switch (this.bb()) {
			case 0: {
				let e = this.rl();
				return e > 2147483647 ? e - 4294967296 : e;
			}
			case 1: return this.rc();
			case 2: return 0;
			default: return 0;
		}
	}
	bll() {
		let e = this.bbb(), t = 0;
		for (let n = 0; n < e; n++) t += this.rc() * 2 ** (8 * n);
		return t;
	}
	bd() {
		switch (this.bb()) {
			case 0: return this.rd();
			case 1: return 1;
			case 2: return 0;
			default: return NaN;
		}
	}
	bd2() {
		return [this.bd(), this.bd()];
	}
	bd3() {
		return [
			this.bd(),
			this.bd(),
			this.bd()
		];
	}
	rd2() {
		return [this.rd(), this.rd()];
	}
	byteAt(e) {
		let t = this.data, n = e >> 3, r = e & 7;
		return r === 0 ? t[n] : (t[n] << r | (t[n + 1] ?? 0) >> 8 - r) & 255;
	}
	dd(e) {
		let t = this.bb();
		if (t === 0) return e;
		if (t === 3) return this.rd();
		let n = this.scratch ??= /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
		if (n.setFloat64(0, e, !0), t === 1) {
			this.need(32);
			let e = this.pos;
			for (let t = 0; t < 4; t++) n.setUint8(t, this.byteAt(e + t * 8));
			this.pos = e + 32;
		} else {
			this.need(48);
			let e = this.pos;
			n.setUint8(4, this.byteAt(e)), n.setUint8(5, this.byteAt(e + 8));
			for (let t = 0; t < 4; t++) n.setUint8(t, this.byteAt(e + 16 + t * 8));
			this.pos = e + 48;
		}
		return n.getFloat64(0, !0);
	}
	dd2(e, t) {
		return [this.dd(e), this.dd(t)];
	}
	dd3(e, t, n) {
		return [
			this.dd(e),
			this.dd(t),
			this.dd(n)
		];
	}
	bt() {
		return this.b() ? 0 : this.bd();
	}
	be() {
		return this.b() ? [
			0,
			0,
			1
		] : this.bd3();
	}
	mc() {
		let e = 0, t = 0;
		for (;;) {
			let n = this.rc();
			if (n & 128) e |= (n & 127) << t, t += 7;
			else {
				let r = !!(n & 64);
				return n &= 63, e |= n << t, r ? -e : e;
			}
		}
	}
	umc() {
		let e = 0, t = 0;
		for (;;) {
			let n = this.rc();
			if (e += (n & 127) * 2 ** t, !(n & 128)) return e;
			t += 7;
		}
	}
	ms() {
		let e = 0, t = 0;
		for (;;) {
			let n = this.rs();
			if (e += (n & 32767) * 2 ** t, !(n & 32768)) return e;
			t += 15;
		}
	}
	h() {
		let e = this.rc(), t = e >> 4 & 15, n = e & 15, r = 0;
		for (let e = 0; e < n; e++) r = r * 256 + this.rc();
		return {
			code: t,
			value: r
		};
	}
	hAbs(e) {
		let t = this.rc(), n = t >> 4 & 15, r = t & 15, i = 0;
		for (let e = 0; e < r; e++) i = i * 256 + this.rc();
		switch (n) {
			case 6: return e + 1;
			case 8: return e - 1;
			case 10: return e + i;
			case 12: return e - i;
			default: return i;
		}
	}
	hValue() {
		let e = this.rc() & 15, t = 0;
		for (let n = 0; n < e; n++) t = t * 256 + this.rc();
		return t;
	}
	tBytes() {
		let e = this.bs();
		return this.bytes(Math.max(0, e));
	}
	tu() {
		let e = this.bs(), t = "";
		for (let n = 0; n < e; n++) t += String.fromCharCode(this.rs());
		return t.replace(/\0+$/, "");
	}
	sentinel() {
		return this.bytes(16);
	}
	crc() {
		return this.align(), this.rs();
	}
	align() {
		this.pos = this.pos + 7 & -8;
	}
};
Array.from({ length: 128 }, (e, t) => 128 + t);
//#endregion
//#region node_modules/nasjidwg/dist/dwg/meta.js
var w = 128, ne = 48, T = 54700, E = 20, D = [
	1,
	1,
	1,
	0
], re = 10, O = 15, ie = 1, k = 7, ae = [
	"AcDb_Thumbnail_Schema",
	"AcDbDs::TreatedAsObjectDataSchema",
	"AcDbDs::LegacySchema",
	"AcDbDs::IndexedPropertySchema",
	"AcDbDs::HandleAttributeSchema",
	"AcDb3DSolid_ASM_Data"
], oe = ae.length - 1, se = 1, ce = 2, A = 3, j = 4, le = 5, ue = 6, de = 7, fe = 8, pe = 14, M = 9, me = 15, he = 4, ge = (e) => he + e + (e - 1 >> 2), N = () => {
	let e = [], t = (t) => {
		e.push(t & 255);
	}, n = (t) => {
		e.push(t & 255, t >>> 8 & 255);
	}, r = (e) => {
		n(e & 65535), n(Math.floor(e / 65536) & 65535);
	};
	return {
		b: e,
		u8: t,
		u16: n,
		u32: r,
		u64: (e) => {
			r(e >>> 0), r(Math.floor(e / 4294967296));
		},
		str: (t) => {
			for (let n = 0; n < t.length; n++) e.push(t.charCodeAt(n) & 255);
			e.push(0);
		},
		bytes: (t) => {
			for (let n = 0; n < t.length; n++) e.push(t[n]);
		},
		align: (t) => {
			for (; e.length % t;) e.push(0);
		}
	};
}, _e = (e, t, n, r, i) => {
	e.u32(t), e.u32(n), e.u32(r), e.u16(i.length);
	for (let t of i) e.u64(t);
}, ve = (e, t, n) => {
	e.u16(2), e.u64(t), e.u64(t + 1), e.u16(2), _e(e, 0, 0, re, [t + 2, t + 3]), _e(e, 0, n, O, []);
}, ye = (e) => {
	let t = e.filter((e) => e.sab.length > 0);
	if (t.length === 0) return null;
	let n = N(), r = [], i = [];
	for (let e of D) n.u32(8), n.u32(e);
	r.push(n.b.length), i.push(A), ve(n, 0, 1);
	for (let e = 0; e < 3; e++) r.push(n.b.length), i.push(A), n.u16(0), n.u16(1), _e(n, 0, 2 + e, ie, []);
	r.push(n.b.length), i.push(A), n.u16(0), n.u16(1), n.u32(8), n.u32(5), n.u32(k), n.u16(1), n.u16(0), n.u16(1), n.u8(0), n.align(4);
	let a = [
		"AcDbDs::ID",
		"Thumbnail_Data",
		"AcDbDs::TreatedAsObjectData",
		"AcDbDs::Legacy",
		"AcDs:Indexable",
		"AcDbDs::HandleAttribute"
	];
	n.u32(a.length);
	for (let e of a) n.str(e);
	let o = N();
	for (let e of D) o.u32(8), o.u32(e);
	r.push(o.b.length), i.push(j), ve(o, D.length, 1);
	let s = ["AcDbDs::ID", "ASM_Data"];
	o.u32(s.length);
	for (let e of s) o.str(e);
	let c = N();
	c.u64(ae.length);
	for (let e = 0; e < ae.length; e++) c.u32(e), c.u32(i[e]), c.u32(r[e]);
	c.u64(0), c.u64(D.length * 2);
	for (let e of [A, j]) for (let t = 0; t < D.length; t++) c.u32(e), c.u32(t * 8), c.u32(t + 1);
	c.u32(ae.length);
	for (let e of ae) c.str(e);
	let l = N(), u = [];
	{
		let e = 0;
		for (let n of t) u.push(e), e += 4 + n.sab.length;
	}
	t.forEach((e, t) => {
		l.u32(E), l.u32(1), l.u64(e.handle), l.u32(u[t]);
	}), l.align(16);
	for (let e of t) l.u32(e.sab.length), l.bytes(e.sab);
	let d = N();
	d.u64(t.length), t.forEach((e, t) => {
		d.u32(ue), d.u32(t * E), d.u32(oe);
	});
	let f = N();
	f.u32(1), f.u32(oe), f.u64(t.length), t.forEach((e, t) => f.u64(t)), f.u64(1), f.u32(t.length);
	let p = t.map((e, t) => ({
		h: e.handle,
		i: t
	})).sort((e, t) => e.h - t.h);
	for (let e of p) f.u64(e.h), f.u64(1), f.u64(e.i);
	let m = (e) => Math.ceil((ne + e) / w) * w, h = [], g = w, _ = (e, t, n, r) => {
		let i = m(n.length);
		h.push({
			name: e,
			id: t,
			body: n,
			at: g,
			size: i,
			tally: r
		}), g += i;
	};
	_("segidx", se, Array(96).fill(0), 0), _("datidx", ce, d.b, 0), _("schdat", A, n.b, pe), _("schdat", j, o.b, M), _("schidx", le, c.b, me), _("_data_", ue, l.b, ge(t.length)), _("search", de, f.b, 0);
	let v = g, y = N();
	for (let e = 0; e < fe; e++) {
		let t = h.find((t) => t.id === e);
		y.u64(t ? t.at : 0), y.u32(t ? t.size : 0);
	}
	h[0].body = y.b;
	let b = new Uint8Array(v), x = N();
	for (let e of "jard") x.u8(e.charCodeAt(0));
	x.u16(w), x.u16(1), x.u32(8), x.u32(2), x.u32(0), x.u32(1), x.u64(w), x.u32(fe), x.u32(le), x.u32(ce), x.u32(de), x.u32(0), x.u64(v), x.u32(0), x.u32(0), b.set(Uint8Array.from(x.b), 0);
	for (let e of h) {
		let t = N();
		t.u16(T);
		for (let n of e.name) t.u8(n.charCodeAt(0));
		t.u64(e.id), t.u64(e.size), t.u32(1), t.u32(0), t.u32(e.name === "_data_" ? 0 : e.tally), t.u32(e.name === "_data_" ? e.tally : 0), t.u64(0), b.set(Uint8Array.from(t.b), e.at), b.set(Uint8Array.from(e.body), e.at + ne);
	}
	return b;
}, P = class {
	buf = /* @__PURE__ */ new Uint8Array(1024);
	pos = 0;
	scratch = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
	ensure(e) {
		let t = this.pos + e + 7 >> 3;
		if (t <= this.buf.length) return;
		let n = this.buf.length * 2;
		for (; n < t;) n *= 2;
		let r = new Uint8Array(n);
		r.set(this.buf), this.buf = r;
	}
	bytes() {
		return this.buf.slice(0, this.pos + 7 >> 3);
	}
	get byteLength() {
		return this.pos + 7 >> 3;
	}
	b(e) {
		this.ensure(1), e & 1 && (this.buf[this.pos >> 3] |= 128 >> (this.pos & 7)), this.pos++;
	}
	bb(e) {
		this.b(e >> 1), this.b(e);
	}
	bbb(e) {
		this.b(e >> 2), this.b(e >> 1), this.b(e);
	}
	rc(e) {
		this.ensure(8);
		let t = this.pos & 7, n = this.pos >> 3, r = e & 255;
		t === 0 ? this.buf[n] = r : (this.buf[n] |= r >> t, this.buf[n + 1] = r << 8 - t & 255), this.pos += 8;
	}
	raw(e) {
		for (let t = 0; t < e.length; t++) this.rc(e[t]);
	}
	rs(e) {
		this.rc(e), this.rc(e >> 8);
	}
	rl(e) {
		this.rs(e), this.rs(Math.floor(e / 65536));
	}
	rll(e) {
		this.rl(e >>> 0), this.rl(Math.floor(e / 4294967296));
	}
	bll(e) {
		let t = 0, n = e;
		for (; n > 0 && t < 7;) t++, n = Math.floor(n / 256);
		this.bbb(t);
		let r = e;
		for (let e = 0; e < t; e++) this.rc(r % 256), r = Math.floor(r / 256);
	}
	rd(e) {
		this.scratch.setFloat64(0, e, !0);
		for (let e = 0; e < 8; e++) this.rc(this.scratch.getUint8(e));
	}
	bs(e) {
		e === 0 ? this.bb(2) : e === 256 ? this.bb(3) : e >= 0 && e <= 255 ? (this.bb(1), this.rc(e)) : (this.bb(0), this.rs(e < 0 ? e + 65536 : e));
	}
	bl(e) {
		e === 0 ? this.bb(2) : e >= 0 && e <= 255 ? (this.bb(1), this.rc(e)) : (this.bb(0), this.rl(e < 0 ? e + 4294967296 : e));
	}
	bd(e) {
		e === 0 ? this.bb(2) : e === 1 ? this.bb(1) : (this.bb(0), this.rd(e));
	}
	bd2(e, t) {
		this.bd(e), this.bd(t);
	}
	bd3(e, t, n) {
		this.bd(e), this.bd(t), this.bd(n);
	}
	dd(e, t) {
		e === t || Number.isNaN(e) && Number.isNaN(t) ? this.bb(0) : (this.bb(3), this.rd(e));
	}
	bt(e) {
		e === 0 ? this.b(1) : (this.b(0), this.bd(e));
	}
	be(e, t, n) {
		e === 0 && t === 0 && n === 1 ? this.b(1) : (this.b(0), this.bd3(e, t, n));
	}
	mc(e) {
		let t = Math.abs(Math.round(e)), n = e < 0, r = [];
		for (;;) {
			let e = t & 127;
			if (t = Math.floor(t / 128), r.push(e), t === 0) break;
		}
		r[r.length - 1] & 64 && r.push(0), n && (r[r.length - 1] |= 64);
		for (let e = 0; e < r.length; e++) this.rc(r[e] | (e < r.length - 1 ? 128 : 0));
	}
	umc(e) {
		let t = Math.round(e);
		for (;;) {
			let e = t % 128;
			if (t = Math.floor(t / 128), t === 0) {
				this.rc(e);
				return;
			}
			this.rc(e | 128);
		}
	}
	ms(e) {
		let t = Math.round(e);
		for (;;) {
			let e = t % 32768;
			if (t = Math.floor(t / 32768), t === 0) {
				this.rs(e);
				return;
			}
			this.rs(e | 32768);
		}
	}
	h(e, t) {
		let n = [], r = t;
		for (; r > 0;) n.unshift(r % 256), r = Math.floor(r / 256);
		this.rc((e & 15) << 4 | n.length);
		for (let e of n) this.rc(e);
	}
	strTarget;
	utf16 = !1;
	t(e) {
		let t = this.strTarget ?? this;
		if (this.utf16) {
			t.tu(e);
			return;
		}
		t.bs(e.length);
		for (let n = 0; n < e.length; n++) t.rc(e.charCodeAt(n) & 255);
	}
	tu(e) {
		this.bs(e.length);
		for (let t = 0; t < e.length; t++) this.rs(e.charCodeAt(t));
	}
	putBits(e, t) {
		for (let n = 0; n < t; n++) this.b(e[n >> 3] >> 7 - (n & 7) & 1);
	}
	appendBits(e) {
		let t = e.bytes(), n = e.pos;
		for (let e = 0; e < n; e++) this.b(t[e >> 3] >> 7 - (e & 7) & 1);
	}
	align() {
		this.pos = this.pos + 7 & -8;
	}
	patchRl(e, t) {
		let n = (t < 0 ? t + 4294967296 : t) >>> 0;
		for (let t = 0; t < 32; t++) {
			if (!(n >>> (t & -8) + (7 - (t & 7)) & 1)) continue;
			let r = e + t;
			this.buf[r >> 3] |= 128 >> (r & 7);
		}
	}
}, be = class {
	buf = /* @__PURE__ */ new Uint8Array(1024);
	length = 0;
	ensure(e) {
		let t = this.length + e;
		if (t <= this.buf.length) return;
		let n = this.buf.length * 2;
		for (; n < t;) n *= 2;
		let r = new Uint8Array(n);
		r.set(this.buf.subarray(0, this.length)), this.buf = r;
	}
	push(...e) {
		this.ensure(e.length);
		for (let t = 0; t < e.length; t++) this.buf[this.length++] = e[t];
	}
	append(e) {
		if (this.ensure(e.length), e instanceof Uint8Array) this.buf.set(e, this.length), this.length += e.length;
		else for (let t = 0; t < e.length; t++) this.buf[this.length++] = e[t];
	}
	at(e) {
		return this.buf[e];
	}
	set(e, t) {
		this.buf[e] = t;
	}
	view(e = 0, t = this.length) {
		return this.buf.subarray(e, t);
	}
	bytes() {
		return this.buf.slice(0, this.length);
	}
}, xe = (e, t, n = 0, r = t.length) => {
	let i = e & 65535;
	for (let e = n; e < r; e++) {
		i ^= t[e];
		for (let e = 0; e < 8; e++) i = i & 1 ? i >>> 1 ^ 40961 : i >>> 1;
	}
	return i & 65535;
};
Object.freeze({ kind: "byLayer" }), Object.freeze({ kind: "byBlock" }), Object.freeze(Array.from({ length: 256 }, (e, t) => Object.freeze({
	kind: "aci",
	index: t
})));
var F = (e) => {
	let t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", n = "";
	for (let r = 0; r < e.length; r += 3) {
		let i = e[r], a = e[r + 1], o = e[r + 2];
		n += t[i >> 2] + t[(i & 3) << 4 | (a ?? 0) >> 4] + (r + 1 < e.length ? t[((a ?? 0) & 15) << 2 | (o ?? 0) >> 6] : "=") + (r + 2 < e.length ? t[(o ?? 0) & 63] : "=");
	}
	return n;
}, Se = (e) => e < 0 ? "handle" : e <= 9 ? "string" : e <= 37 ? "point" : e <= 59 ? "real" : e <= 79 ? "int16" : e <= 99 ? "int32" : e <= 102 || e === 105 ? "string" : e <= 109 ? "invalid" : e <= 139 ? "point" : e <= 149 ? "real" : e <= 169 ? "int64" : e <= 179 ? "int16" : e <= 209 ? "invalid" : e <= 269 ? "point" : e <= 279 ? "int16" : e <= 289 ? "int8" : e <= 299 ? "bool" : e <= 309 ? "string" : e <= 319 ? "binary" : e <= 329 || e <= 369 ? "handle" : e <= 389 ? "int16" : e <= 399 ? "handle" : e <= 409 ? "int16" : e <= 419 ? "string" : e <= 429 ? "int32" : e <= 439 ? "string" : e <= 459 ? "int32" : e <= 469 ? "real" : e <= 479 || e === 999 ? "string" : e < 1e3 ? "invalid" : e === 1004 ? "binary" : e <= 1009 ? "string" : e <= 1039 ? "point" : e <= 1042 ? "real" : e <= 1069 ? "point" : e <= 1070 ? "int16" : e === 1071 ? "int32" : "invalid", Ce = (e) => e <= 14 ? 14 : e >= 2010 ? 2018 : e, we = 1314062336, Te = (e) => e.startsWith("ACDBASSOC") || e.startsWith("ASSOC") || /DEPENDENCYBODY$/.test(e), Ee = /* @__PURE__ */ new Set([
	"ACDBASSOCDEPENDENCY",
	"ACDBASSOCVALUEDEPENDENCY",
	"ASSOCDIMDEPENDENCYBODY",
	"BLOCKPARAMDEPENDENCYBODY"
]), De = (e, t) => {
	let n = e.toUpperCase();
	if (n === "ACDBASSOCDEPENDENCY" || n === "ACDBASSOCGEOMDEPENDENCY" || n === "ACDBASSOCVALUEDEPENDENCY" || n === "ASSOCDIMDEPENDENCYBODY") return {
		dwgVersion: 27,
		maintVersion: t === "r2013" ? 175 : 50
	};
}, Oe = [[1, "AcDbAssocSingleEdgePersSubentId"], [3, "AcDbAssocEdgePersSubentId"]], ke = {
	AcConstrainedBoundedLine: [
		"H",
		"BL",
		"3BD",
		"3BD",
		"B",
		"3BD",
		"3BD"
	],
	AcConstrainedDatumLine: [
		"H",
		"BL",
		"3BD",
		"3BD"
	],
	AcConstrainedImplicitPoint: [
		"H",
		"BL",
		"3BD?",
		"RC",
		"BL",
		"BL"
	],
	AcConstrainedArc: [
		"H",
		"BL",
		"3BD",
		"3BD",
		"3BD",
		"BD",
		"BD",
		"BD",
		"BD13",
		"3BD",
		"3BD"
	],
	AcConstrainedCircle: [
		"H",
		"BL",
		"3BD",
		"3BD",
		"3BD",
		"BD",
		"BD",
		"BD",
		"BD13"
	],
	AcPointCurveConstraint: [
		"BL",
		"B",
		"B"
	],
	AcFixedConstraint: [
		"BL",
		"B",
		"B"
	],
	AcPointCoincidenceConstraint: [
		"BL",
		"B",
		"B"
	],
	AcColinearConstraint: [
		"BL",
		"B",
		"B"
	],
	AcParallelConstraint: [
		"BL",
		"B",
		"B"
	],
	AcPerpendicularConstraint: [
		"BL",
		"B",
		"B"
	],
	AcTangentConstraint: [
		"BL",
		"B",
		"B"
	],
	AcEqualLengthConstraint: [
		"BL",
		"B",
		"B"
	],
	AcEqualRadiusConstraint: [
		"BL",
		"B",
		"B"
	],
	AcMidPointConstraint: [
		"BL",
		"B",
		"B"
	],
	AcCenterPointConstraint: [
		"BL",
		"B",
		"B"
	],
	AcHorizontalConstraint: [
		"BL",
		"B",
		"B",
		"BL"
	],
	AcVerticalConstraint: [
		"BL",
		"B",
		"B",
		"BL"
	],
	AcDistanceConstraint: [
		"BL",
		"B",
		"B",
		"H",
		"H",
		"RC",
		"3BD?rc"
	],
	AcAngleConstraint: [
		"BL",
		"B",
		"B",
		"H",
		"H",
		"RC"
	],
	AcRadiusDiameterConstraint: [
		"BL",
		"B",
		"B",
		"H",
		"H",
		"RC"
	]
}, Ae = (e) => {
	let t = atob(e), n = new Uint8Array(t.length);
	for (let e = 0; e < t.length; e++) n[e] = t.charCodeAt(e);
	return n;
}, je = class {
	bytes;
	nbits;
	r;
	constructor(e, t) {
		this.bytes = e, this.nbits = t, this.r = new te(e, 0, t);
	}
	get pos() {
		return this.r.pos;
	}
	copy(e, t, n) {
		for (let r = t; r < n; r++) e.b(this.bytes[r >> 3] >> 7 - (r & 7) & 1);
	}
}, Me = (e) => {
	if (!e.strData || !e.strBits) return [];
	let t = new te(Ae(e.strData), 0, e.strBits), n = [];
	try {
		for (; t.pos < e.strBits;) {
			let r = t.pos, i = t.bs();
			if (i < 0 || t.pos + i * 16 > e.strBits) return null;
			let a = "";
			for (let e = 0; e < i; e++) a += String.fromCharCode(t.rs());
			n.push({
				start: r,
				end: t.pos,
				text: a
			});
		}
	} catch {
		return null;
	}
	return t.pos === e.strBits ? n : null;
}, Ne = (e, t) => {
	let n = new P(), r = e.strData ? Ae(e.strData) : /* @__PURE__ */ new Uint8Array();
	for (let e of t) if (typeof e == "string") n.tu(e);
	else for (let t = e.start; t < e.end; t++) n.b(r[t >> 3] >> 7 - (t & 7) & 1);
	return n.pos ? {
		strData: F(n.bytes()),
		strBits: n.pos
	} : {};
}, Pe = (e, t, n) => ({
	...e,
	data: F(t.bytes()),
	dataBits: t.pos,
	strData: n.strData,
	strBits: n.strBits
}), Fe = (e, t, n, r) => {
	let i = e.r, a = i.bs(), o = e.pos;
	i.bl(), i.bl(), i.bl();
	let s = i.bl();
	if (s < 0 || s > 1e5) return null;
	for (let e = 0; e < s; e++) i.b();
	let c = e.pos;
	if (n === "r2013") {
		if (a === 2) {
			let e = i.bs(), t = i.bl(), n = i.bs(), r = i.bl();
			if (e !== 0 || t !== 0 || n !== 0 || r !== 0) return null;
		} else if (a !== 1) return null;
	} else if (a !== 1) return null;
	return r === "r2013" ? (t.bs(2), e.copy(t, o, c), t.bs(0), t.bl(0), t.bs(0), t.bl(0)) : (t.bs(1), e.copy(t, o, c)), { numDeps: s };
}, Ie = (e, t, n) => {
	let r = new je(Ae(e.data), e.dataBits), i = new P();
	return Fe(r, i, t, n) ? (r.copy(i, r.pos, r.nbits), Pe(e, i, {
		strData: e.strData,
		strBits: e.strBits
	})) : null;
}, Le = (e, t, n) => {
	let r = Me(e);
	if (!r) return null;
	let i = new je(Ae(e.data), e.dataBits), a = i.r, o = new P(), s = a.bs();
	if (s < 0 || s > 3) return null;
	a.bl(), a.b(), a.b(), a.b(), a.b(), a.bl();
	let c = a.b();
	a.bl(), a.bs(), a.b();
	let l = i.pos;
	i.copy(o, 0, l);
	let u = +!!c;
	if (t === "pre2013") {
		let t = r[u];
		if (!t) return null;
		let n = Oe.find(([, e]) => e === t.text)?.[0];
		return n === void 0 ? null : (o.b(0), o.bl(n), i.copy(o, i.pos, i.nbits), Pe(e, o, Ne(e, r.filter((e, t) => t !== u))));
	}
	if (a.b() !== 0) return null;
	let d = a.bl(), f = Oe.find(([e]) => e === d)?.[1];
	return f ? (i.copy(o, i.pos, i.nbits), Pe(e, o, Ne(e, [
		...r.slice(0, u),
		f,
		...r.slice(u)
	]))) : null;
}, Re = (e, t, n) => {
	let r = Me(e);
	if (!r) return null;
	let i = new je(Ae(e.data), e.dataBits), a = i.r, o = new P(), s = Fe(i, o, t, n);
	if (!s) return null;
	let c = i.pos;
	a.bl(), a.b();
	for (let e = 0; e < 9; e++) a.bd();
	let l = a.bl();
	if (l < 0 || l > 1e5) return null;
	a.bl(), i.copy(o, c, i.pos);
	let u = 2 + s.numDeps + 1 + l, d = e.refs, f = () => {
		let e = d?.[u++];
		return e && e.value !== "0" ? e.value : null;
	}, p, m = 0, h = [], g = [];
	if (t === "r2013") {
		if (a.bl() !== 0 || a.bl() !== 0 || a.b() !== 0 || (m = a.bl(), m < 0 || m > r.length) || (p = a.bl(), p < 0 || p > 1e5)) return null;
		for (let e = 0; e < p; e++) {
			if (a.b() !== 0) return null;
			let e = a.bl();
			if (e < 1 || e > m) return null;
			h.push(r[e - 1].text), g.push(a.bl());
		}
	} else {
		if (p = a.bl(), p < 0 || p > 1e5 || r.length < p) return null;
		for (let e = 0; e < p; e++) h.push(r[e].text);
	}
	let _ = [];
	try {
		for (let e = 0; e < p; e++) {
			let n = ke[h[e]];
			if (!n) return null;
			let r, o, s, c = (e) => {
				let t = i.pos;
				return e(), [t, i.pos];
			}, l = () => {
				let e = a.bl();
				if (e < 0 || e > 1e5) throw RangeError("connections");
				for (let t = 0; t < e; t++) a.bl();
			};
			t === "r2013" ? (r = c(() => a.bl()), s = c(l), o = c(() => a.rc())) : (r = c(() => a.bl()), o = c(() => a.rc()), s = c(l));
			let u = new te(i.bytes, r[0], r[1]).bl();
			if (t === "r2013" && g[e] !== u) return null;
			let d = [], p = i.pos, m = null, v = 0, y = !0;
			for (let e of n) switch (e) {
				case "H": {
					let e = f();
					y &&= (m = e, !1);
					break;
				}
				case "BL":
					a.bl();
					break;
				case "B":
					a.b();
					break;
				case "RC":
					v = a.rc();
					break;
				case "BD":
					a.bd();
					break;
				case "3BD":
					a.bd3();
					break;
				case "3BD?":
					m !== null && a.bd3();
					break;
				case "3BD?rc":
					v !== 0 && a.bd3();
					break;
				case "RC13":
				case "BD13":
					if (d.push([p, i.pos], e), t === "r2013" && (e === "RC13" ? a.rc() : a.bd()) !== 0) return null;
					p = i.pos;
					break;
				default: return null;
			}
			d.push([p, i.pos]), _.push({
				id: u,
				idSpan: r,
				statusSpan: o,
				connSpan: s,
				body: d
			});
		}
	} catch {
		return null;
	}
	if (i.pos !== i.nbits || d && u !== d.length) return null;
	let v = _.map((e, t) => t).sort((e, t) => _[e].id - _[t].id), y = (e) => {
		for (let t of e.body) typeof t == "string" ? n === "r2013" && (t === "RC13" ? o.rc(0) : o.bd(0)) : i.copy(o, t[0], t[1]);
	}, b = (e) => r.find((t) => t.text === h[e]) ?? h[e], x;
	if (n === "r2013") {
		let e = [];
		for (let t of v) e.includes(h[t]) || e.push(h[t]);
		o.bl(0), o.bl(0), o.b(0), o.bl(e.length), o.bl(p);
		for (let t of v) {
			let n = _[t];
			o.b(0), o.bl(e.indexOf(h[t]) + 1), i.copy(o, n.idSpan[0], n.idSpan[1]);
		}
		for (let e of v) {
			let t = _[e];
			i.copy(o, t.idSpan[0], t.idSpan[1]), i.copy(o, t.connSpan[0], t.connSpan[1]), i.copy(o, t.statusSpan[0], t.statusSpan[1]), y(t);
		}
		let n = r.slice(t === "r2013" ? m : p);
		x = [...e.map((e) => r.find((t) => t.text === e) ?? e), ...n];
	} else {
		o.bl(p);
		for (let e of v) {
			let t = _[e];
			i.copy(o, t.idSpan[0], t.idSpan[1]), i.copy(o, t.statusSpan[0], t.statusSpan[1]), i.copy(o, t.connSpan[0], t.connSpan[1]), y(t);
		}
		let e = r.slice(t === "r2013" ? m : p);
		x = [...v.map(b), ...e];
	}
	return Pe(e, o, Ne(e, x));
}, ze = (e, t, n, r) => {
	if (n === r) return t;
	let i = e.toUpperCase();
	if (Ee.has(i)) return t;
	if (!t.data || !t.dataBits) return null;
	try {
		switch (i) {
			case "ACDBASSOCNETWORK":
			case "ACDBASSOCVARIABLE": return Ie(t, n, r);
			case "ACDBASSOCGEOMDEPENDENCY": return Le(t, n, r);
			case "ACDBASSOC2DCONSTRAINTGROUP": return Re(t, n, r);
			default: return null;
		}
	} catch {
		return null;
	}
}, Be = (e, t) => {
	let n = /* @__PURE__ */ new Uint8Array(256), r = e & 255, i = r;
	for (let e = 1; e < 256; e <<= 1) {
		for (let t = 0; t < e; t++) n[e + t] = n[t] ^ i;
		i = (i << 1 ^ (i & 128 ? r : 0)) & 255;
	}
	let a = (e, t) => {
		let r = 0, i = e, a = t;
		for (; a !== 0;) a & 1 && (r ^= i), a >>= 1, i <<= 1;
		return (r ^ n[r >> 8]) & 255;
	}, o = [1], s = 1;
	for (let e = 0; e < t; e++) {
		s = a(s, 2);
		let e = Array(o.length + 1).fill(0);
		for (let t = 0; t < o.length; t++) e[t + 1] ^= o[t], e[t] ^= a(o[t], s);
		o = e;
	}
	return {
		parity: t,
		mul: a,
		gen: Uint8Array.from(o)
	};
}, Ve = /* @__PURE__ */ new Map([[239, Be(361, 16)], [251, Be(285, 4)]]), He = (e, t, n, r) => {
	let i = e.parity, a = e.gen, o = new Uint8Array(i);
	for (let s = r - 1; s >= 0; s--) {
		let r = o[i - 1];
		for (let t = i - 1; t > 0; t--) o[t] = o[t - 1] ^ e.mul(r, a[t]);
		o[0] = t[n + s] ^ e.mul(r, a[0]);
	}
	for (let t = 0; t < i; t++) {
		let t = o[i - 1];
		for (let n = i - 1; n > 0; n--) o[n] = o[n - 1] ^ e.mul(t, a[n]);
		o[0] = e.mul(t, a[0]);
	}
	return o;
}, Ue = (e, t, n) => {
	let r = Ve.get(t);
	if (!r) throw Error(`R2007: no Reed-Solomon code for ${t} data bytes`);
	let i = new Uint8Array(n * 255);
	for (let a = 0; a < n; a++) {
		let o = a * t, s = Math.max(0, Math.min(t, e.length - o)), c = new Uint8Array(t);
		s > 0 && c.set(e.subarray(o, o + s));
		for (let e = 0; e < t; e++) i[e * n + a] = c[e];
		let l = He(r, c, 0, t);
		for (let e = 0; e < r.parity; e++) i[(t + e) * n + a] = l[e];
	}
	return i;
}, We = (e) => e + 7 & -8, Ge = (e) => e + 31 & -32, Ke = 1152, qe = (e) => {
	let t = Math.max(1, Math.ceil(We(e.length) / 251)), n = Ue(e, 251, t), r = new Uint8Array(Ge(t * 255));
	return r.set(n), r;
}, Je = (e) => {
	let t = new Uint8Array(e.length), n = e.length, r = 0, i = 0;
	for (; i + 8 <= n; i += 8) for (let n = 3; n >= 0; n--) t[r++] = e[i + 2 * n], t[r++] = e[i + 2 * n + 1];
	if (i + 4 <= n) {
		for (let n = 1; n >= 0; n--) t[r++] = e[i + 2 * n], t[r++] = e[i + 2 * n + 1];
		i += 4;
	}
	return i + 2 <= n && (t[r++] = e[i], t[r++] = e[i + 1], i += 2), i < n && (t[r++] = e[i]), t;
}, I = (1n << 64n) - 1n, Ye = (() => {
	let e = /* @__PURE__ */ new BigUint64Array(256);
	for (let t = 0; t < 256; t++) {
		let n = BigInt(t);
		for (let e = 0; e < 8; e++) n = n & 1n ? n >> 1n ^ 10785157014839085493n : n >> 1n;
		e[t] = n;
	}
	return e;
})(), Xe = (e) => {
	let t = 214013n * BigInt(e.length) + 2531011n & I, n = ~(t | (214013n * t + 2531011n & I) << 32n & I) & I, r = Je(e);
	for (let e = 0; e < r.length; e++) n = n >> 8n ^ Ye[Number((n ^ BigInt(r[e])) & 255n)];
	return n;
}, L = (e) => {
	let t = BigInt(e) * 214013n + 2531011n & I;
	return ~(t | t * (214013n << 32n & I) + (2531011n << 32n & I) & I) & I;
}, R = (e) => ~((BigInt(e) * 214013n + 2531011n & I) * ((1n << 32n) + 214013n & I) + BigInt(e) + 2531011n & I) & I, Ze = (() => {
	let e = /* @__PURE__ */ new BigUint64Array(256);
	for (let t = 0; t < 256; t++) {
		let n = BigInt(t) << 56n & I;
		for (let e = 0; e < 8; e++) n = n & 1n << 63n ? n << 1n & I ^ 4823603603198064275n : n << 1n & I;
		e[t] = n;
	}
	return e;
})(), z = (e, t) => {
	let n = t & I, r = Je(e);
	for (let e = 0; e < r.length; e++) n = Ze[Number((n >> 56n ^ BigInt(r[e])) & 255n)] ^ n << 8n & I;
	return ~n & I;
}, B = (e, t) => {
	let n = t & 31n;
	return n === 0n ? e : (e << n | e >> 64n - n) & I;
}, Qe = (e) => {
	let t = /* @__PURE__ */ new Uint8Array(16);
	for (let n = 0; n < 8; n++) t[n] = Number(e >> BigInt(8 * n) & 255n), t[8 + n] = Number(B(e, e) >> BigInt(8 * n) & 255n);
	return z(t, L(16));
}, $e = (e, t) => {
	let n = t & I, r = Je(e);
	for (let e = 0; e < r.length; e++) n = n >> 8n ^ Ye[Number((n ^ BigInt(r[e])) & 255n)];
	return n;
}, et = (e, t, n) => {
	let r = (e) => {
		let t = /* @__PURE__ */ new Uint8Array(64);
		for (let n = 0; n < 8; n++) for (let r = 0; r < 8; r++) t[n * 8 + r] = Number(e[n] >> BigInt(8 * r) & 255n);
		return t;
	}, i = [];
	i[0] = B(e, t), i[1] = B(i[0], i[0]), i[2] = B(t, i[1]), i[3] = B(i[2], i[2]), i[4] = B(e, i[3]), i[5] = B(i[4], i[4]), i[6] = B(i[5], i[5]), i[7] = B(i[6], i[6]);
	let a = z(r(i), ~t & I), o = [];
	o[0] = B(e, t), o[1] = B(a, o[0]), o[2] = B(t, o[1]), o[3] = B(a, o[2]), o[4] = B(e, o[3]), o[5] = B(a, o[4]), o[6] = B(t, o[5]), o[7] = B(o[6], o[6]);
	let s = $e(r(o), ~e & I), c = /* @__PURE__ */ new Uint8Array(40);
	return [
		a,
		s,
		e,
		t,
		n
	].forEach((e, t) => {
		for (let n = 0; n < 8; n++) c[t * 8 + n] = Number(e >> BigInt(8 * n) & 255n);
	}), c;
}, tt = (e) => {
	let t = Math.imul(214013, e.length) + 2531011 >>> 0, n = Je(e), r = t & 65535, i = t >>> 16 & 65535, a = 0;
	for (; a < n.length;) {
		let e = Math.min(a + 5552, n.length);
		for (; a < e; a++) r += n[a], i += r;
		r %= 65521, i %= 65521;
	}
	return i % 65521 * 65536 + r % 65521 >>> 0;
}, nt = (e) => {
	let t = l(e);
	return t.length < e.length ? t : e;
}, rt = {
	"AcDb:Header": {
		hash: 850920409,
		maxSize: 2048
	},
	"AcDb:AuxHeader": {
		hash: 1425016074,
		maxSize: 2048
	},
	"AcDb:Classes": {
		hash: 1062470751,
		maxSize: 63488
	},
	"AcDb:Handles": {
		hash: 1064174672,
		maxSize: 63488
	},
	"AcDb:Template": {
		hash: 1242825934,
		maxSize: 1024
	},
	"AcDb:ObjFreeSpace": {
		hash: 2011301407,
		maxSize: 63488
	},
	"AcDb:AcDbObjects": {
		hash: 1733035433,
		maxSize: 63488
	},
	"AcDb:RevHistory": {
		hash: 1621231027,
		maxSize: 4096
	},
	"AcDb:SummaryInfo": {
		hash: 1903822351,
		maxSize: 128
	},
	"AcDb:AppInfo": {
		hash: 1067451454,
		maxSize: 768
	}
}, it = [
	"AcDb:RevHistory",
	"AcDb:AcDbObjects",
	"AcDb:ObjFreeSpace",
	"AcDb:Template",
	"AcDb:Handles",
	"AcDb:Classes",
	"AcDb:AuxHeader",
	"AcDb:Header"
], at = 17861133150734645215n, ot = (e, t) => {
	let n = new Uint32Array(t + 14);
	n[0] = e >>> 0;
	for (let e = 1; e < n.length; e++) n[e] = Math.imul(1812433253, (n[e - 1] ^ n[e - 1] >>> 30) >>> 0) + e >>> 0;
	let r = (e) => BigInt(n[t + e]) << 32n | BigInt(n[t + e + 1]);
	return {
		secmapSeed: r(0) & at,
		pagesMapSeed: r(2) & at,
		r1: r(4),
		r2: r(6),
		word5: r(8) & at,
		crcSeedEncoded: r(10) & at,
		key: r(12)
	};
}, st = (e) => {
	let t = Math.max(8, We(e.length)), n = Math.ceil(t * 5 / 239), r = Math.max(1024, Ge(n * 255)), i = Math.floor(r / 255), a = Math.max(1, Math.floor(i * 239 / t)), o = new Uint8Array(i * 239);
	for (let n = 0; n < a; n++) o.set(e, n * t);
	let s = Ue(o, 239, i), c = new Uint8Array(r);
	return c.set(s.subarray(0, Math.min(s.length, r))), {
		page: c,
		copies: a
	};
}, ct = (e) => {
	let t = (e, t) => {
		e.push(t & 255, t >>> 8 & 255, t >>> 16 & 255, t >>> 24 & 255);
		let n = Math.floor(t / 4294967296);
		e.push(n & 255, n >>> 8 & 255, n >>> 16 & 255, n >>> 24 & 255);
	}, n = (e, t) => {
		for (let n = 0n; n < 8n; n++) e.push(Number(t >> n * 8n & 255n));
	}, r = (e, t, n) => {
		for (let r = 0; r < 8; r++) e[t + r] = Number(n >> BigInt(8 * r) & 255n);
	}, i = it.map((t) => e.find((e) => e.name === t)).filter((e) => e !== void 0);
	for (let t of e) i.includes(t) || i.push(t);
	let a = [], o = 3;
	for (let e of i) {
		let t = [], n = Math.max(1, Math.ceil(e.data.length / 63488));
		for (let r = 0; r < n; r++) {
			let n = e.data.subarray(r * 63488, Math.min((r + 1) * 63488, e.data.length)), i = nt(n);
			t.push({
				id: o++,
				target: r * 63488,
				uncomp: n.length,
				payload: i,
				disk: qe(i),
				cksum: tt(n),
				crc: Xe(i)
			});
		}
		a.push(t);
	}
	let s = o - 3, c = o++, u = o++, d = o + 2, f = o + 3, p = [];
	i.forEach((e, r) => {
		let i = rt[e.name], o = i?.maxSize ?? 63488;
		t(p, e.data.length), t(p, o), t(p, 0), t(p, i?.hash ?? 0), t(p, (e.name.length + 1) * 2), t(p, 0), t(p, 4), t(p, a[r].length);
		for (let t = 0; t < e.name.length; t++) p.push(e.name.charCodeAt(t) & 255, 0);
		p.push(0, 0);
		for (let e of a[r]) t(p, e.target), t(p, o), t(p, e.id), t(p, e.uncomp), t(p, e.payload.length), t(p, e.cksum), n(p, e.crc);
	}), t(p, 0), t(p, 63488), t(p, 0), t(p, 0), t(p, 0), t(p, 0), t(p, 4), t(p, 0);
	let m = Uint8Array.from(p), h = nt(m), g = st(h), _ = 1024, v = /* @__PURE__ */ new Uint8Array(), y = /* @__PURE__ */ new Uint8Array(), b = null;
	for (let e = 0; e < 4; e++) {
		let e = [];
		t(e, _), t(e, d), t(e, _), t(e, f);
		for (let n of a) for (let r of n) t(e, r.disk.length), t(e, r.id);
		if (t(e, g.page.length), t(e, c), t(e, g.page.length), t(e, u), v = Uint8Array.from(e), y = nt(v), b = st(y), b.page.length === _) break;
		_ = b.page.length;
	}
	let x = b.page, S = Ke;
	S += x.length * 2;
	for (let e of a) for (let t of e) S += t.disk.length;
	S += g.page.length * 2;
	let C = S, ee = C + 1024, te = s + 4, w = ot(Number(R(ee) & 4294967295n) >>> 0, 139 + ee % 221), ne = [], T = (e) => t(ne, e), E = (e) => n(ne, e);
	T(112), T(ee), E(Xe(y)), T(b.copies), E(w.pagesMapSeed), T(x.length), T(f), T(0), T(d), T(C - Ke), T(y.length), T(v.length), T(te), T(f), T(32), T(64), E(Xe(v)), T(63488), T(4), T(1), T(i.length + 1), E(Xe(m)), T(h.length), T(u), T(c), T(m.length), E(Xe(h)), T(g.copies), E(w.secmapSeed), T(393472), T(0), E(w.crcSeedEncoded), T(0), T(0);
	let D = Uint8Array.from(ne), re = z(D, R(D.length));
	for (let e = 0; e < 8; e++) D[264 + e] = Number(re >> BigInt(8 * e) & 255n);
	let O = l(D), ie = w.key, k = new Uint8Array(32 + O.length), ae = new DataView(k.buffer);
	r(k, 0, Qe(ie)), r(k, 8, ie), r(k, 16, z(O, R(O.length))), ae.setInt32(24, O.length, !0), ae.setInt32(28, 0, !0), k.set(O, 32);
	let oe = We(k.length), se = /* @__PURE__ */ new Uint8Array(717);
	for (let e = 0; e * oe + k.length <= se.length; e++) se.set(k, e * oe);
	let ce = Ue(se, 239, 3), A = new Uint8Array(ee);
	for (let e = 0; e < 6; e++) A[e] = "AC1021".charCodeAt(e);
	A[11] = 50, A[12] = 3, A[17] = 33, A[18] = 255, A[19] = 30, A[20] = 0, A[22] = 33, A[23] = 255, A[40] = 128, A.set(ce.subarray(0, Math.min(ce.length, 984)), 128), A.set(et(w.r1, w.r2, w.word5), 1112);
	let j = Ke;
	A.set(x, j), j += x.length, A.set(x, j), j += x.length;
	for (let e of a) for (let t of e) A.set(t.disk, j), j += t.disk.length;
	return A.set(g.page, j), j += g.page.length, A.set(g.page, j), j += g.page.length, A.set(A.subarray(128, 1112), C), A;
}, lt = "ACIS BinaryFile", ut = "ASM BinaryFile", dt = {
	face: [
		["reversed", "forward"],
		["double", "single"],
		["in", "out"]
	],
	coedge: [["reversed", "forward"]],
	edge: [["reversed", "forward"]],
	"cone-surface": [
		null,
		null,
		["reversed", "forward"]
	],
	"plane-surface": [["reverse_v", "forward_v"]],
	"torus-surface": [["reverse_v", "forward_v"]],
	"sphere-surface": [["reverse_v", "forward_v"]],
	"spline-surface": [["reversed", "forward"]],
	pcurve: [["reversed", "forward"]]
}, ft = {
	1: "ignore",
	2: "copy",
	4: "keep_all"
}, pt = {
	exactsur: [{
		0: "full",
		1: "summary"
	}],
	nubs: [
		{
			0: "open",
			1: "closed",
			2: "periodic"
		},
		{
			0: "open",
			1: "closed",
			2: "periodic"
		},
		{ 0: "none" },
		{ 0: "none" }
	]
}, mt = (e) => {
	if (Object.is(e, -0)) return "-0";
	if (Number.isInteger(e) && Math.abs(e) < 0x38d7ea4c68000) return String(e);
	let t = e.toPrecision(19);
	return t.includes("e") ? t = t.replace(/e([+-])(\d)$/, "e$10$2") : t.includes(".") && (t = t.replace(/0+$/, "").replace(/\.$/, "")), t;
}, ht = (e) => {
	let t = e.replace(/[^A-Za-z0-9+/]/g, ""), n = new Uint8Array(t.length * 3 >> 2), r = 0, i = 0, a = 0;
	for (let e of t) i = i << 6 | "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(e), a += 6, a >= 8 && (a -= 8, n[r++] = i >> a & 255);
	return n.subarray(0, r);
}, gt = (e) => {
	let t = typeof e == "string" ? ht(e) : e, n = new DataView(t.buffer, t.byteOffset, t.byteLength), r = (e) => {
		for (let n = 0; n < e.length; n++) if (t[n] !== e.charCodeAt(n)) return !1;
		return !0;
	};
	if (!r(lt) && !r(ut)) return null;
	let i = 15;
	if (i + 16 > t.length) return null;
	let a = n.getUint32(i, !0);
	i += 8;
	let o = n.getUint32(i, !0);
	i += 4;
	let s = n.getUint32(i, !0);
	i += 4;
	let c = (e) => {
		let n = "";
		for (let r = 0; r < e; r++) n += String.fromCharCode(t[i + r]);
		return i += e, n;
	};
	try {
		let e = [], l = [];
		for (; e.length < 3 && t[i] === 7;) i++, e.push(c(t[i++]));
		for (; l.length < 3 && t[i] === 6;) i++, l.push(n.getFloat64(i, !0)), i += 8;
		let u = [], d = [], f = "", p = "", m = 0, h = "", g = 0, _ = 0, v = (e) => {
			f &&= (d.push(f.slice(0, -1)), d.length, ""), d.push(e);
		};
		for (; i < t.length;) {
			let e = t[i++];
			switch (e) {
				case 4:
					v(String(n.getInt32(i, !0))), i += 4;
					break;
				case 6:
					v(mt(n.getFloat64(i, !0))), i += 8;
					break;
				case 7: {
					let e = t[i++];
					v("@" + e + " " + c(e));
					break;
				}
				case 8: {
					let e = n.getUint32(i, !0);
					i += 4, v("@" + e + " " + c(e));
					break;
				}
				case 10:
				case 11: {
					let t = e === 10, n = h === "spline" && g === 0 ? ["reversed", "forward"] : dt[p]?.[m];
					m++, g++, d.push(n ? t ? n[0] : n[1] : t ? "F" : "I");
					break;
				}
				case 12:
					v("$" + n.getInt32(i, !0)), i += 4;
					break;
				case 13: {
					let e = t[i++], n = f + c(e);
					f = "", d.length || (p = n, m = 0), h = n, g = 0, _ = 0, d.push(n);
					break;
				}
				case 14: {
					let e = t[i++];
					f += c(e) + "-";
					break;
				}
				case 15:
					d.push("{");
					break;
				case 16:
					d.push("}");
					break;
				case 17:
					u.push(d.join(" ") + " #"), d = [], p = "";
					break;
				case 19:
				case 20:
					for (let e = 0; e < 3; e++) v(mt(n.getFloat64(i, !0))), i += 8;
					break;
				case 21: {
					let e = n.getInt32(i, !0);
					i += 4;
					let t = pt[h]?.[_]?.[e];
					_++, v(t ?? ft[e] ?? String(e));
					break;
				}
				case 23:
					v(String(n.getBigInt64(i, !0))), i += 8;
					break;
				default: return null;
			}
		}
		let y = [
			`${a} ${u.length} ${o} ${s} `,
			e.map((e) => e.length + " " + e).join(" ") + " ",
			l.map(mt).join(" ") + " "
		], b = r(ut) ? "End-of-ASM-data " : "End-of-ACIS-data ";
		return y.join("\n") + "\n" + u.join("\n") + "\n" + b + "\n";
	} catch {
		return null;
	}
}, _t = (e, t, n) => {
	if (t >= 2007) return e;
	let r = String(e).replace(/\\\\/g, ""), i = (e) => e.replace(/* @__PURE__ */ RegExp("", "g"), "\\\\");
	if (t <= 2e3) return i(r.replace(/\\p[^;]*;/g, ""));
	if (!/\\px/.test(r)) return e;
	let a = Number.isFinite(n) && n > 0 ? n : 1, o = /^-?(\d+\.?\d*|\.\d+)$/, s = (e) => String(+(Number(e) * a).toFixed(5));
	return i(r.replace(/\\p([^;]*);/g, (e, t) => {
		let n = [], r = [], i = !1;
		for (let e of t.replace(/^x/, "").split(",")) {
			if (i) {
				o.test(e) && r.push(s(e));
				continue;
			}
			let t = e[0], a = e.slice(1);
			(t === "i" || t === "l" || t === "r") && o.test(a) ? n.push(t + s(a)) : t === "t" && (i = !0, o.test(a) && r.push(s(a)));
		}
		return r.length && n.push("t" + r.join(",")), n.length ? "\\p" + n.join(",") + ";" : "";
	}));
}, vt = [
	149,
	160,
	78,
	40,
	153,
	130,
	26,
	229,
	94,
	65,
	224,
	95,
	157,
	58,
	77,
	0
], yt = [
	31,
	37,
	109,
	7,
	212,
	54,
	40,
	40,
	157,
	87,
	202,
	63,
	157,
	68,
	16,
	43
], bt = [
	224,
	218,
	146,
	248,
	43,
	201,
	215,
	215,
	98,
	168,
	53,
	192,
	98,
	187,
	239,
	212
], xt = [
	207,
	123,
	31,
	35,
	253,
	222,
	56,
	169,
	95,
	124,
	104,
	184,
	78,
	109,
	51,
	95
], St = [
	48,
	132,
	224,
	220,
	2,
	33,
	199,
	86,
	160,
	131,
	151,
	71,
	177,
	146,
	204,
	160
], Ct = [
	141,
	161,
	196,
	184,
	196,
	169,
	248,
	197,
	192,
	220,
	244,
	95,
	231,
	207,
	182,
	138
], wt = [
	114,
	94,
	59,
	71,
	59,
	86,
	7,
	58,
	63,
	35,
	11,
	160,
	24,
	48,
	73,
	117
], Tt = [
	212,
	123,
	33,
	206,
	40,
	147,
	159,
	191,
	83,
	36,
	64,
	9,
	18,
	60,
	170,
	1
], Et = [
	43,
	132,
	222,
	49,
	215,
	108,
	96,
	64,
	172,
	219,
	191,
	246,
	237,
	195,
	85,
	254
], Dt = 1097010747, Ot = 1097007163, kt = 1097093995, At = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", V = (e) => {
	let t = e.replace(/[^A-Za-z0-9+/]/g, ""), n = new Uint8Array(t.length * 3 >> 2), r = 0, i = 0, a = 0;
	for (let e of t) i = i << 6 | At.indexOf(e), a += 6, a >= 8 && (a -= 8, n[r++] = i >> a & 255);
	return n.subarray(0, r);
}, jt = "ASM BinaryFile", Mt = (e) => {
	let t = V(e.slice(0, 24));
	for (let e = 0; e < 14; e++) if (t[e] !== jt.charCodeAt(e)) return !1;
	return !0;
}, Nt = (e, t) => {
	let n = (2166136261 ^ e) >>> 0;
	for (let e = 0; e < t.length; e++) n = Math.imul(n ^ t[e], 16777619) >>> 0;
	let r = /* @__PURE__ */ new Uint8Array(16), i = n || 1;
	for (let e = 0; e < 16; e++) i = Math.imul(i, 1103515245) + 12345 >>> 0, r[e] = i >>> 16 & 255;
	return r[6] = r[6] & 15 | 64, r[8] = r[8] & 63 | 128, r;
};
function Pt(e, t, n, r, i, a, s, c) {
	let l = new be(), u = (e) => {
		l.append(e);
	}, d = (e) => {
		l.push(e & 255, e >>> 8 & 255, e >>> 16 & 255, e >>> 24 & 255);
	}, f = Uint8Array.from(xt), p = Uint8Array.from(St), m = (e, t, n, r = 0, a = !1) => {
		let o = [];
		for (let t of e) o.push(t);
		let s = o.length, c = a && i === 2018 && t.length >= 4 ? t.length - 4 : t.length;
		o.push(c & 255, c >>> 8 & 255, c >>> 16 & 255, c >>> 24 & 255);
		for (let e of t) o.push(e);
		i === 2018 && !(a && t.length >= 4) && o.push(0, 0, 0, 0);
		let l = xe(49345, Uint8Array.from(o.slice(s)));
		o.push(l & 255, l >> 8 & 255);
		for (let e of n) o.push(e);
		for (let e = 0; e < r; e++) o.push(0);
		return Uint8Array.from(o);
	}, h = m(f, e, p), g = m(Uint8Array.from(Ct), t, Uint8Array.from(wt), 8, !0), _ = new be();
	_.push(202, 13, 0, 0);
	let v = [];
	for (let e of n.slice().sort((e, t) => e.handle - t.handle)) {
		let t = _.length;
		v.push({
			handle: e.handle,
			offset: t
		});
		let n = e.bytes.length;
		for (;;) {
			let e = n % 32768;
			n = Math.floor(n / 32768);
			let t = n === 0 ? e : e | 32768;
			if (_.push(t & 255, t >> 8 & 255), n === 0) break;
		}
		if (e.handleBits !== void 0) {
			let t = e.handleBits;
			for (;;) {
				let e = t % 128;
				if (t = Math.floor(t / 128), t === 0) {
					_.push(e);
					break;
				}
				_.push(e | 128);
			}
		}
		_.append(e.bytes);
		let r = xe(49345, _.view(t));
		_.push(r & 255, r >> 8 & 255);
	}
	let y = _.bytes(), b = new be();
	{
		let e = 0;
		for (; e < v.length;) {
			let t = b.length;
			b.push(0, 0);
			let n = 0, r = 0;
			for (; e < v.length && b.length - t < 2e3;) {
				let t = v[e++], i = t.handle - n;
				for (;;) {
					let e = i % 128;
					if (i = Math.floor(i / 128), i === 0) {
						b.push(e);
						break;
					}
					b.push(e | 128);
				}
				let a = t.offset < r, o = Math.abs(t.offset - r), s = [];
				for (;;) {
					let e = o & 127;
					if (o = Math.floor(o / 128), s.push(e), o === 0) break;
				}
				s[s.length - 1] & 64 && s.push(0), a && (s[s.length - 1] |= 64);
				for (let e = 0; e < s.length; e++) b.push(s[e] | (e < s.length - 1 ? 128 : 0));
				n = t.handle, r = t.offset;
			}
			let i = b.length - t;
			b.set(t, i >> 8 & 255), b.set(t + 1, i & 255);
			let a = xe(49345, b.view(t));
			b.push(a >> 8 & 255, a & 255);
		}
		let t = b.length;
		b.push(0, 2);
		let n = xe(49345, b.view(t));
		b.push(n >> 8 & 255, n & 255);
	}
	let x = b.bytes(), S = [
		{
			name: "AcDb:Header",
			data: h
		},
		{
			name: "AcDb:Handles",
			data: x
		},
		{
			name: "AcDb:AcDbObjects",
			data: y
		}
	];
	g.length && S.splice(1, 0, {
		name: "AcDb:Classes",
		data: g
	}), s && S.push({
		name: "AcDb:AcDsPrototype_1b",
		data: s
	});
	let C = c?.png && i === 2018 ? {
		type: 6,
		data: c.png
	} : c?.bmp ? {
		type: 2,
		data: Bt(c.bmp)
	} : null;
	C && S.push({
		name: "AcDb:Preview",
		data: zt(288, [C])
	});
	{
		let e = [], t = (t) => {
			e.push(t & 255, t >>> 8 & 255);
		}, a = (e) => {
			t(e & 65535), t(Math.floor(e / 65536));
		}, o = (e) => {
			i === 2018 ? a(e) : t(e);
		};
		e.push(255, 119, 1), t(i === 2018 ? 33 : i === 2007 ? 27 : 25), o(0), a(1), a(4294967295), t(1), t(0), a(0), t(22), o(46), t(22), o(46), t(4), a(1381), a(0), a(1);
		for (let t = 0; t < 11; t++) e.push(0);
		e.push(1, 1, 1), t(23), t(1), a(2461269), a(36254536), a(2461269), a(36254536), a(r), a(0), t(0), t(53);
		for (let e = 0; e < 3; e++) a(0);
		a(1);
		for (let e = 0; e < 4; e++) a(0);
		let s = [], c = (e) => {
			s.push(e & 255, e >>> 8 & 255, e >>> 16 & 255, e >>> 24 & 255);
		}, l = (e) => {
			c(e >>> 0), c(Math.floor(e / 4294967296));
		};
		l(0), l(n.length), c(2461269), c(36254536), s.push(4);
		for (let e of [
			50,
			100,
			512,
			4294967295
		]) l(e), l(0);
		S.push({
			name: "AcDb:AuxHeader",
			data: Uint8Array.from(e)
		}, {
			name: "AcDb:Template",
			data: Uint8Array.from([
				0,
				0,
				1,
				0
			])
		}, {
			name: "AcDb:ObjFreeSpace",
			data: Uint8Array.from(s)
		}, {
			name: "AcDb:RevHistory",
			data: Uint8Array.from([
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				1,
				0,
				0,
				0,
				0,
				0,
				0,
				0
			])
		});
	}
	if (a && (S.length = 0, S.push(...a)), i === 2007) return ct(S);
	let ee = {
		"AcDb:Header": 1,
		"AcDb:AuxHeader": 2,
		"AcDb:Classes": 3,
		"AcDb:Handles": 4,
		"AcDb:Template": 5,
		"AcDb:ObjFreeSpace": 6,
		"AcDb:AcDbObjects": 7,
		"AcDb:RevHistory": 8,
		"AcDb:AcDsPrototype_1b": 9,
		"AcDb:Preview": 10
	}, te = { "AcDb:Preview": !0 }, w = (e) => te[e.name] ? Math.max(1024, e.data.length + 1023 & -1024) : ne, ne = 29696, T = [
		"AcDb:Preview",
		"AcDb:AcDsPrototype_1b",
		"AcDb:RevHistory",
		"AcDb:AcDbObjects",
		"AcDb:ObjFreeSpace",
		"AcDb:Template",
		"AcDb:Handles",
		"AcDb:Classes",
		"AcDb:AuxHeader",
		"AcDb:Header"
	].map((e) => S.find((t) => t.name === e)).filter((e) => e !== void 0 && e.data.length > 0), E = (e) => ee[T[e].name] ?? 0, D = (e, t) => {
		let n = e & 65535, r = Math.floor(e / 65536) & 65535, i = 0;
		for (; i < t.length;) {
			let e = Math.min(i + 5552, t.length);
			for (; i < e; i++) n += t[i], r += n;
			n %= 65521, r %= 65521;
		}
		return r * 65536 + n >>> 0;
	}, re = /* @__PURE__ */ new Uint32Array(256);
	for (let e = 0; e < 256; e++) {
		let t = e;
		for (let e = 0; e < 8; e++) t = t & 1 ? 3988292384 ^ t >>> 1 : t >>> 1;
		re[e] = t >>> 0;
	}
	let O = (e) => {
		let t = 4294967295;
		for (let n = 0; n < e.length; n++) t = re[(t ^ e[n]) & 255] ^ t >>> 8;
		return (t ^ 4294967295) >>> 0;
	}, ie = (e) => e + 31 & -32, k = [], ae = 256, oe = 1;
	T.forEach((e, t) => {
		let n = w(e), r = Math.max(1, Math.ceil(e.data.length / n));
		for (let i = 0; i < r; i++) {
			let r = new Uint8Array(n);
			r.set(e.data.subarray(i * n, Math.min((i + 1) * n, e.data.length)));
			let a = te[e.name] ? r : o(r), s = ie(32 + a.length);
			k.push({
				number: oe++,
				address: ae,
				diskSize: s,
				payload: a,
				secIdx: t,
				chunk: i,
				cap: n
			}), ae += s;
		}
	});
	let se = T[0]?.name === "AcDb:Preview" ? 288 : 0, ce = k.length, A = ce + 2, j = A + 1, le = A + 2;
	u(i === 2018 ? [
		65,
		67,
		49,
		48,
		51,
		50
	] : [
		65,
		67,
		49,
		48,
		49,
		56
	]), u([
		0,
		0,
		0,
		0,
		0
	]), l.push(0), l.push(3), d(se);
	let ue = i === 2018 ? 33 : 25;
	for (l.push(ue), l.push(0), l.push(30), l.push(0), l.push(0), l.push(ue), l.push(0), d(0), d(0), d(0), d(0), d(128); l.length < 128;) l.push(0);
	let de = l.length;
	for (let e = 0; e < 108; e++) l.push(0);
	{
		let e = 1;
		for (let t = 0; t < 256; t++) e = Math.imul(e, 214013) + 2531011 >>> 0, t >= 236 && l.push(e >>> 16 & 255);
	}
	for (let e of k) {
		let t = D(0, e.payload), n = /* @__PURE__ */ new Uint8Array(32), r = new DataView(n.buffer);
		r.setUint32(0, 1097008187, !0), r.setUint32(4, E(e.secIdx), !0), r.setUint32(8, e.payload.length, !0), r.setUint32(12, e.diskSize, !0), r.setUint32(16, e.chunk * e.cap, !0), r.setUint32(20, 0, !0), r.setUint32(28, t, !0), r.setUint32(24, D(t, n), !0);
		let i = (kt ^ e.address) >>> 0;
		for (let e = 0; e < 32; e += 4) r.setUint32(e, (r.getUint32(e, !0) ^ i) >>> 0, !0);
		if (l.length !== e.address) throw Error(`layout drifted: page at ${l.length}, planned ${e.address}`);
		for (u(n), u(e.payload); l.length < e.address + e.diskSize;) l.push(0);
	}
	let fe = T.length + 1, pe = [], M = (e) => {
		pe.push(e & 255, e >>> 8 & 255, e >>> 16 & 255, e >>> 24 & 255);
	}, me = (e) => {
		M(e >>> 0), M(Math.floor(e / 4294967296));
	};
	M(fe), M(2), M(ne), M(0), M(fe);
	let he = (e, t, n, r, i = ne, a = !1) => {
		me(t), M(r.length), M(i), M(1), M(a ? 1 : 2), M(n), M(0);
		let o = /* @__PURE__ */ new Uint8Array(64);
		for (let t = 0; t < e.length && t < 63; t++) o[t] = e.charCodeAt(t);
		for (let e of o) pe.push(e);
		for (let e of r) M(e.number), M(e.size), me(e.offset);
	};
	he("", 0, 0, []), T.forEach((e, t) => {
		he(e.name, e.data.length, E(t), k.filter((e) => e.secIdx === t).map((e) => ({
			number: e.number,
			size: e.payload.length,
			offset: e.chunk * e.cap
		})), w(e), !!te[e.name]);
	});
	let ge = (e, t) => {
		let n = o(t), r = /* @__PURE__ */ new Uint8Array(20), i = new DataView(r.buffer);
		i.setUint32(0, e, !0), i.setUint32(4, t.length, !0), i.setUint32(8, n.length, !0), i.setUint32(12, 2, !0);
		let a = D(0, r);
		return i.setUint32(16, D(a, n), !0), u(r), u(n), 20 + n.length;
	}, N = l.length, _e = ie(ge(Ot, Uint8Array.from(pe)));
	for (; l.length < N + _e;) l.push(0);
	let ve = N + _e, ye = (ce + 2) * 8, P = ie(20 + ye + Math.ceil(ye / 255) + 2 + 160), F = [], Se = (e) => {
		F.push(e & 255, e >>> 8 & 255, e >>> 16 & 255, e >>> 24 & 255);
	};
	for (let e of k) Se(e.number), Se(e.diskSize);
	Se(j), Se(_e), Se(le), Se(P);
	let Ce = ge(Dt, Uint8Array.from(F));
	if (Ce + 20 + 108 > P) throw Error(`page map outgrew its declared slot: ${Ce} > ${P}`);
	let we = ve + Ce + 20;
	{
		let e = /* @__PURE__ */ new Uint8Array(108), t = new DataView(e.buffer);
		for (let t = 0; t < 11; t++) e[t] = "AcFssFcAJMB".charCodeAt(t);
		t.setUint32(16, 108, !0), t.setUint32(20, 4, !0), t.setUint32(36, 1, !0), t.setUint32(40, le, !0);
		let n = (e, n) => {
			t.setUint32(e, n >>> 0, !0), t.setUint32(e + 4, Math.floor(n / 4294967296), !0);
		};
		n(44, ve + P - 256), n(52, we), t.setUint32(60, 0, !0), t.setUint32(64, A, !0), t.setUint32(68, 32, !0), t.setUint32(72, 128, !0), t.setUint32(76, 64, !0), t.setUint32(80, le, !0), n(84, ve - 256), t.setUint32(92, j, !0), t.setUint32(96, le, !0), t.setUint32(100, 0, !0), t.setUint32(104, O(e), !0);
		let r = 1;
		for (let t = 0; t < e.length; t++) r = Math.imul(r, 214013) + 2531011 >>> 0, l.set(de + t, e[t] ^ r >>> 16 & 255);
	}
	{
		let e = /* @__PURE__ */ new Uint8Array(20);
		new DataView(e.buffer).setUint32(0, Dt, !0), e[12] = 2, u(e);
		for (let e = 0; e < 108; e++) l.push(l.at(de + e));
	}
	return l.bytes();
}
var Ft = [
	0,
	.05,
	.09,
	.13,
	.15,
	.18,
	.2,
	.25,
	.3,
	.35,
	.4,
	.5,
	.53,
	.6,
	.7,
	.8,
	.9,
	1,
	1.06,
	1.2,
	1.4,
	1.58,
	2,
	2.11
], It = (e) => {
	if (e === void 0) return 29;
	let t = 0, n = Infinity;
	for (let r = 0; r < Ft.length; r++) {
		let i = Math.abs(Ft[r] - e);
		i < n && (n = i, t = r);
	}
	return t;
}, Lt = (e) => e.color.kind === "byBlock" ? 0 : e.color.kind === "aci" ? e.color.index & 255 : e.color.kind === "rgb" ? 7 : 256, Rt = (e, t) => {
	let n = new P();
	for (let r of e) {
		if ("point" in r && r.point) {
			let e = r.code >= 1e3 ? r.code - 1e3 : r.code;
			n.rc(e), n.rd(r.point.x), n.rd(r.point.y), n.rd(r.point.z ?? 0);
			continue;
		}
		let e = r.code >= 1e3 ? r.code - 1e3 : r.code, i = "value" in r ? r.value : "";
		if (e === 0) {
			let e = String(i);
			if (n.rc(0), t >= 2007) {
				n.rs(e.length);
				for (let t = 0; t < e.length; t++) n.rs(e.charCodeAt(t));
			} else {
				let t = [];
				for (let n = 0; n < e.length; n++) t.push(e.charCodeAt(n) & 255);
				n.rc(t.length), n.rc(0), n.rc(30), n.raw(t);
			}
		} else if (e === 2) n.rc(2), n.rc(+(i === "}"));
		else if (e === 3 || e === 5) {
			n.rc(e);
			let t = typeof i == "number" ? i : parseInt(String(i), 16);
			(!Number.isFinite(t) || t < 0) && (t = 0);
			let r = [
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0
			];
			for (let e = 7; e >= 0; e--) r[e] = t % 256, t = Math.floor(t / 256);
			n.raw(r);
		} else if (e === 4) {
			let e = String(i).replace(/[^0-9a-fA-F]/g, ""), t = Math.min(255, e.length >> 1);
			n.rc(4), n.rc(t);
			for (let r = 0; r < t; r++) n.rc(parseInt(e.slice(r * 2, r * 2 + 2), 16));
		} else e >= 40 && e <= 42 ? (n.rc(e), n.rd(typeof i == "number" ? i : 0)) : e === 70 ? (n.rc(70), n.rs(typeof i == "number" ? i : 0)) : e === 71 && (n.rc(71), n.rl(typeof i == "number" ? i : 0));
	}
	return n.bytes();
}, H = (e) => {
	let t = b(e).replace(/\r\n?/g, "\n");
	y(t) && (t = p(v(t, !1)));
	let n = "";
	for (let e = 0; e < t.length; e++) {
		let r = t.charCodeAt(e);
		n += r > 255 ? "\\U+" + r.toString(16).toUpperCase().padStart(4, "0") : t[e];
	}
	return n;
}, zt = (e, t) => {
	let n = 1 + t.length, r = e + 16 + 4 + 1 + n * 9, i = 1 + n * 9 + 80 + t.reduce((e, t) => e + t.data.length, 0), a = [], o = (e) => {
		a.push(e & 255, e >>> 8 & 255, e >>> 16 & 255, e >>> 24 & 255);
	};
	a.push(...yt), o(i), a.push(n), a.push(1), o(r), o(80);
	let s = r + 80;
	for (let e of t) a.push(e.type), o(s), o(e.data.length), s += e.data.length;
	for (let e = 0; e < 80; e++) a.push(0);
	let c = new Uint8Array(a.length + t.reduce((e, t) => e + t.data.length, 0));
	c.set(a);
	let l = a.length;
	for (let e of t) c.set(e.data, l), l += e.data.length;
	return c;
}, Bt = (e) => e.length > 14 && e[0] === 66 && e[1] === 77 ? e.subarray(14) : e, Vt = (e, t) => Wt(e, 2018, t), Ht = (e) => {
	let t = { ...e.blocks }, n = 0, r = () => {
		for (;;) {
			let e = `*T${++n}`;
			if (!Object.keys(t).some((t) => t.toLowerCase() === e.toLowerCase())) return e;
		}
	}, i = !1, a = (e) => e.map((e) => {
		if (e.type !== "table" || e.blockName && /^\*T/i.test(e.blockName) && t[e.blockName]) return e;
		let n = r();
		return t[n] = {
			name: n,
			basePoint: {
				x: 0,
				y: 0,
				z: 0
			},
			entities: []
		}, i = !0, {
			...e,
			blockName: n
		};
	}), o = a(e.entities), s = e.paperSpace ? a(e.paperSpace) : void 0;
	for (let [n, r] of Object.entries(e.blocks)) r.entities.some((e) => e.type === "table") && (t[n] = {
		...r,
		entities: a(r.entities)
	});
	return i ? {
		...e,
		blocks: t,
		entities: o,
		...s ? { paperSpace: s } : {}
	} : e;
}, Ut = (e, t, n) => {
	let r = t === 2007 ? "pre2013" : t >= 2018 ? "r2013" : void 0, i = e.unknownObjects ?? [];
	if (!r || !i.length) return e;
	let a = t === 2007 ? 2007 : 2018, o = (t) => t.encoding === 2007 ? "pre2013" : t.encoding === 2018 ? e.header.version === "R2010" ? "pre2013" : "r2013" : void 0, s = [], c = [];
	for (let t of i) {
		let n = (t.appClass?.dxfName ?? t.sourceType ?? "").toUpperCase();
		if (!Te(n) || t.data === void 0 || t.tags?.length) {
			s.push(t);
			continue;
		}
		let i = o(t);
		if (i === void 0) return e;
		if (i === r && t.encoding === a) {
			s.push(t);
			continue;
		}
		let l = ze(n, t, i, r);
		if (!l) return e;
		let u = De(n, r), d = u && t.appClass ? {
			...t.appClass,
			...u
		} : t.appClass, f = {
			...t,
			...l,
			encoding: a,
			...d ? { appClass: d } : {}
		};
		s.push(f), c.push(f);
	}
	if (!c.length) return e;
	for (let e of c) n.add(e);
	return {
		...e,
		unknownObjects: s
	};
}, Wt = (e, n, r = {}) => {
	let i = [], a = /* @__PURE__ */ new Set(), o = r.respellAssoc === !0 ? Ut(Ht(e), n, a) : Ht(e), s = r.preserveHandles === !0, c = s && r.verbatimRecords === !0, l = 0;
	if (s) {
		let e = (e) => {
			let t = e ? parseInt(e, 16) : NaN;
			Number.isFinite(t) && t > 0 && (l = Math.max(l, t));
		}, t = (t) => {
			if (e(t.handle), t.type === "insert") for (let n of t.attributes ?? []) e(n.handle);
		};
		for (let e of o.entities) t(e);
		for (let e of o.paperSpace ?? []) t(e);
		for (let e of Object.values(o.blocks)) for (let n of e.entities) t(n);
		for (let t of o.proxyObjects ?? []) e(t.handle);
		for (let t of o.unknownObjects ?? []) e(t.handle);
		for (let t of o.layers) e(t.handle);
		for (let t of o.linetypes) e(t.handle);
		for (let t of o.textStyles) e(t.handle);
		for (let t of Object.values(o.blocks)) e(t.handle);
		for (let t of o.layouts ?? []) e(t.handle), e(t.blockHandle);
		for (let t of o.views ?? []) e(t.handle);
		for (let t of o.vports ?? []) e(t.handle);
		for (let t of o.dimStyles ?? []) e(t.handle);
		for (let t of o.groups ?? []) e(t.handle);
		for (let t of o.tableStyles ?? []) e(t.handle);
		for (let t of o.mleaderStyles ?? []) e(t.handle);
		for (let t of o.mlineStyles ?? []) e(t.handle);
		for (let t of o.ucs ?? []) e(t.handle);
		for (let t of o.variables ?? []) e(t.handle);
		for (let t of Object.values(o.structureHandles ?? {})) e(t);
	}
	let u = l, d = () => ++u, f = /* @__PURE__ */ new Set(), p = /* @__PURE__ */ new Map(), m = (e) => {
		let t = e ? parseInt(e, 16) : NaN;
		if (s && e && Number.isFinite(t) && t > 0 && !f.has(t)) return f.add(t), p.set(t, t), t;
		let n = d();
		return Number.isFinite(t) && t > 0 && !p.has(t) && p.set(t, n), n;
	}, h = (e) => {
		if (!e.annotation) return 0;
		let t = parseInt(e.annotation, 16);
		return Number.isFinite(t) && t > 0 ? p.get(t) ?? 0 : 0;
	}, g = (e) => {
		let t = parseInt(e, 16);
		return !Number.isFinite(t) || t <= 0 ? 0 : p.get(t) ?? t;
	}, _ = !0, v = (e) => {
		let t = m(e);
		return (!e || parseInt(e, 16) !== t) && (_ = !1), t;
	}, y = !0, b = (e) => o.structureHandles?.[e], x = m(b("BLOCK_CONTROL")), S = m(b("LAYER_CONTROL")), C = m(b("STYLE_CONTROL")), ee = m(b("LTYPE_CONTROL")), w = m(b("VIEW_CONTROL")), ne = m(b("UCS_CONTROL")), T = m(b("VPORT_CONTROL")), E = m(b("APPID_CONTROL")), D = m(b("DIMSTYLE_CONTROL")), re = m(b("VX_CONTROL")), O = m(b("NOD")), ie = m(b("ACAD_GROUP")), k = m(b("ACAD_MLINESTYLE")), ae = d(), oe = (e) => o.linetypes.find((t) => e.test(t.name))?.handle, se = m(oe(/^bylayer$/i)), ce = m(oe(/^byblock$/i)), A = m(b("ACAD_LAYOUT")), j = (o.vports ?? []).find((e) => /^\*active$/i.test(e.name)), le = m(j?.handle), ue = new Set(Object.keys(o.blocks).filter((e) => o.blocks[e].xref && !o.blocks[e].isLayout && !/^\*(model_space|paper_space)/i.test(e)).map((e) => e.toLowerCase())), de = (e) => {
		let t = e.indexOf("|");
		if (t <= 0) return;
		let n = e.slice(0, t).toLowerCase();
		return ue.has(n) ? n : void 0;
	}, fe = (e) => !e.xrefDependent || de(e.name) !== void 0, pe = o.layers.filter((e) => !fe(e)).length + o.linetypes.filter((e) => !fe(e)).length + o.textStyles.filter((e) => !fe(e)).length;
	pe && i.push(`${pe} xref-dependent table records`);
	let M = o.layers.filter(fe), me = M.length ? M : [{
		name: "0",
		color: {
			kind: "aci",
			index: 7
		},
		on: !0,
		frozen: !1,
		locked: !1
	}], he = /* @__PURE__ */ new Map();
	for (let e of me) he.set(e.name, v(e.handle));
	let ge = o.textStyles.filter(fe).filter((e, t, n) => !(e.shapeFile && n.some((t) => t !== e && !t.shapeFile && t.name.toLowerCase() === e.name.toLowerCase()))), N = ge.filter((e) => e.shapeFile && e.name.includes("|") && !e.xrefDependent);
	N.length && i.push(`${N.length} orphan shape-file style records`);
	let _e = ge.filter((e) => !N.includes(e)), ve = _e.length ? _e : [{ name: "Standard" }], F = /* @__PURE__ */ new Map();
	for (let e of ve) F.set(e.name, v(e.handle));
	let Te = o.linetypes.filter((e) => !/^(bylayer|byblock)$/i.test(e.name) && fe(e));
	Te.some((e) => /^continuous$/i.test(e.name)) || Te.unshift({
		name: "Continuous",
		description: "Solid line",
		pattern: []
	});
	let Ee = /* @__PURE__ */ new Map();
	for (let e of Te) Ee.set(e.name, v(e.handle));
	let De = [...Ee.entries()].find(([e]) => /^continuous$/i.test(e))[1], Oe = [];
	for (let e of o.dimStyles ?? []) Oe.some((t) => t.name.toLowerCase() === e.name.toLowerCase()) || Oe.push(e);
	Oe.some((e) => /^standard$/i.test(e.name)) || Oe.unshift({ name: "Standard" });
	let ke = /* @__PURE__ */ new Map();
	for (let e of Oe) ke.set(e.name.toLowerCase(), m(e.handle));
	let Ae = ke.get("standard"), je = o.views ?? [], Me = je.map((e) => m(e.handle)), Ne = o.groups ?? [], Pe = Ne.map((e) => m(e.handle)), Fe = [];
	for (let e of o.ucs ?? []) e.name && !Fe.some((t) => t.name.toLowerCase() === e.name.toLowerCase()) && Fe.push(e);
	let Ie = Fe.map((e) => m(e.handle)), Le = (e) => {
		if (typeof e != "string" || !e) return 0;
		let t = Fe.findIndex((t) => t.name.toLowerCase() === e.toLowerCase());
		return t >= 0 ? Ie[t] : 0;
	}, Re = (e) => e && ke.get(e.toLowerCase()) || Ae, ze = {
		name: "STANDARD",
		startAngle: Math.PI / 2,
		endAngle: Math.PI / 2,
		elements: [{
			offset: .5,
			color: { kind: "byLayer" }
		}, {
			offset: -.5,
			color: { kind: "byLayer" }
		}]
	}, Be = [];
	for (let e of [...o.mlineStyles ?? [], ze]) e.name && (Be.some((t) => t.name.toLowerCase() === e.name.toLowerCase()) || Be.push(e));
	let Ve = /* @__PURE__ */ new Map();
	for (let e of Be) Ve.set(e.name.toLowerCase(), m(e.handle));
	let He = Ve.get("standard"), Ue = (e) => typeof e == "string" && Ve.get(e.toLowerCase()) || He, We = (e) => /^\*paper_space.+$/i.test(e), Ge = n >= 2e3 ? Object.keys(o.blocks).filter(We) : [];
	if (n < 2e3) for (let e of Object.keys(o.blocks).filter(We)) i.push(`layout ${e} (needs R2000 or later)`);
	let Ke = o.layouts ?? [], qe = Ke.find((e) => /^model$/i.test(e.name)), Je = Ke.find((e) => !/^model$/i.test(e.name) && !(e.blockName && We(e.blockName))) ?? Ke.find((e) => !/^model$/i.test(e.name)), I = m(qe?.handle), Ye = m(Je?.handle), Xe = Ge.map((e) => {
		let t = Ke.find((t) => t !== Je && t.blockName?.toLowerCase() === e.toLowerCase());
		return {
			nm: e,
			meta: t,
			h: m(t?.handle)
		};
	}), L = m(qe?.blockHandle ?? b("MODEL_SPACE")), R = m(Je?.blockHandle ?? b("PAPER_SPACE")), Ze = (e, t, n) => {
		for (let r of [e?.blockHandle, b(t)]) {
			let e = r ? parseInt(r, 16) : NaN;
			Number.isFinite(e) && e > 0 && !p.has(e) && p.set(e, n);
		}
	};
	Ze(qe, "MODEL_SPACE", L), Ze(Je, "PAPER_SPACE", R);
	let z = Object.keys(o.blocks).filter((e) => n >= 2e3 && We(e) || !/^\*(model_space|paper_space)/i.test(e) && !o.blocks[e].isLayout), B = /* @__PURE__ */ new Map();
	for (let e of z) B.set(e, v(o.blocks[e].handle));
	let Qe = /* @__PURE__ */ new Map();
	for (let e of z) ue.has(e.toLowerCase()) && Qe.set(e.toLowerCase(), B.get(e));
	let $e = (e) => {
		let t = de(e);
		return t === void 0 ? 0 : Qe.get(t) ?? 0;
	}, et = (e) => Qe.has(e.toLowerCase()), tt = /* @__PURE__ */ new Set(/* @__PURE__ */ "line.point.circle.arc.ellipse.polyline.text.mtext.insert.spline.solid.ray.xline.face3d.dimension.hatch.mline.tolerance.shape.leader.viewport.mesh.image.acis.light.table.mleader.underlay.proxy.ole".split(".")), nt = /* @__PURE__ */ new Set(["light", "underlay"]), rt = (e) => n >= 2e3 && !e.data && !!e.tags?.length && !!e.appClass?.dxfName, it = [], at = [], ot = (e) => e.filter((e) => {
		if (e.type === "unknown" && n < 2e3 && e.data !== void 0 && e.encoding !== Ce(n)) return i.push(e.sourceType ?? "sealed entity"), !1;
		if (e.type === "acis") {
			if (e.kind === "surface") return i.push("acis(surface)"), !1;
			let t = !!e.sab && Mt(e.sab), r = !!e.sab && (t ? n >= 2013 : n >= 2007);
			if (!e.sat && !r && (!e.sab || t || gt(e.sab) === null)) return i.push("acis(sab)"), !1;
		}
		return n <= 14 && nt.has(e.type) ? (i.push(e.type + " (needs R2000 or later)"), !1) : n === 13 && e.type === "ole" ? (i.push("ole (needs R14 or later)"), !1) : e.type === "unknown" ? e.data || e.graphicsData || rt(e) ? !0 : (i.push(e.sourceType), !1) : e.type === "insert" && !B.has(e.blockName) ? (i.push("insert:" + e.blockName), !1) : tt.has(e.type) ? !0 : (i.push(e.type), !1);
	}), st = ot(o.entities), ct = (e) => {
		let t = e.findIndex((e) => e.type === "viewport"), n = e.findIndex((e) => e.type === "viewport" && e.id === 1);
		if (t < 0 || n <= t) return e;
		let r = [...e], [i] = r.splice(n, 1);
		return r.splice(t, 0, i), r;
	}, lt = ct(ot(o.paperSpace ?? [])), ut = /* @__PURE__ */ new Map();
	for (let e of z) {
		if (et(e)) {
			let t = o.blocks[e].entities.length;
			t && i.push(`${t} entities inside xref block ${e}`), ut.set(e, []);
			continue;
		}
		ut.set(e, We(e) ? ct(ot(o.blocks[e].entities)) : ot(o.blocks[e].entities));
	}
	let dt = /* @__PURE__ */ new Map(), ft = (e) => e.map((e) => {
		let t = m(e.handle);
		return (!e.handle || parseInt(e.handle, 16) !== t) && (y = !1), dt.set(e, t), t;
	}), pt = ft(st), mt = ft(lt), ht = /* @__PURE__ */ new Map();
	for (let e of z) ht.set(e, ft(ut.get(e)));
	let Dt = (e) => {
		let t = [], n = (n) => {
			for (let r of n) r.type === "insert" && r.blockName === e && t.push(dt.get(r));
		};
		n(st), n(lt);
		for (let e of ut.values()) n(e);
		return t.sort((e, t) => e - t);
	}, Ot = /* @__PURE__ */ new Map(), kt = (e) => {
		for (let t of e) if (t.type === "insert") for (let e of (t.attributes ?? []).filter((e) => e.type === "text")) Ot.set(e, m(e.handle));
	};
	kt(st), kt(lt);
	for (let e of z) kt(ut.get(e));
	let At = /* @__PURE__ */ new Map(), jt = (e, t) => {
		e && At.set(e.toUpperCase(), t);
	};
	for (let [e, t] of dt) jt(e.handle, t);
	for (let [e, t] of Ot) jt(e.handle, t);
	let Ft = /* @__PURE__ */ new Map(), Vt = /* @__PURE__ */ new Map();
	for (let [e, t] of dt) {
		if (e.type !== "hatch") continue;
		let n = e.loops.map((e) => (e.boundaryHandles ?? []).map((e) => At.get(e.toUpperCase()) ?? 0).filter((e) => e > 0)), r = !!(e.associative && n.some((e) => e.length));
		if (Ft.set(e, {
			associative: r,
			loopBounds: n
		}), r) for (let e of n) for (let n of e) {
			let e = Vt.get(n) ?? [];
			e.includes(t) || e.push(t), Vt.set(n, e);
		}
	}
	let Wt = /* @__PURE__ */ new Map();
	Wt.set("ACAD", ae);
	let Gt = [];
	{
		let e = /* @__PURE__ */ new Set(["ACAD"]), t = (t) => {
			if (!t) return;
			let n = t.toUpperCase();
			if (e.has(n)) return;
			e.add(n);
			let r = d();
			Wt.set(n, r), Gt.push({
				name: t,
				handle: r
			});
		};
		for (let e of o.appIds ?? []) t(e);
		([
			o.entities,
			o.paperSpace ?? [],
			...Object.values(o.blocks).map((e) => e.entities)
		].some((e) => e.some((e) => e.type === "mleader")) || n >= 2e3 && o.mleaderStyles?.length) && t("ACAD_MLEADERVER");
		let r = (e) => {
			for (let n of e) {
				for (let e of n.xdata ?? []) t(e.appName || (e.appHandle ? "APP_" + e.appHandle.toUpperCase() : void 0));
				if (n.type === "insert") for (let e of n.attributes ?? []) for (let n of e.xdata ?? []) t(n.appName || (n.appHandle ? "APP_" + n.appHandle.toUpperCase() : void 0));
			}
		};
		r(st), r(lt);
		for (let e of z) r(ut.get(e));
		for (let e of [
			...o.proxyObjects ?? [],
			...o.unknownObjects ?? [],
			...o.tableStyles ?? [],
			...o.mleaderStyles ?? []
		]) for (let n of e.xdata ?? []) t(n.appName || (n.appHandle ? "APP_" + n.appHandle.toUpperCase() : void 0));
	}
	let Kt = d(), qt = d(), Jt = d(), Yt = d(), Xt = /* @__PURE__ */ new Map(), Zt = /* @__PURE__ */ new Map();
	for (let e of z) Xt.set(e, d()), Zt.set(e, d());
	let Qt = [
		...ni(),
		...ri(),
		...Object.values(o.blocks).flatMap((e) => e.entities)
	], $t = Qt.some((e) => e.type === "image"), en = Qt.some((e) => e.type === "light"), tn = Qt.some((e) => e.type === "table"), nn = Qt.some((e) => e.type === "mleader"), rn = /* @__PURE__ */ new Map(), an = 500, U = /* @__PURE__ */ new Map(), W = (e, t, n, r, i, a) => {
		let o = U.get(e);
		if (o) return o.ver === void 0 && i !== void 0 && (o.ver = i, o.maint = a), o.num;
		let s = an++;
		return U.set(e, {
			num: s,
			cpp: t,
			app: n,
			ent: r,
			ver: i,
			maint: a
		}), s;
	}, on = (e, t, n, r) => {
		let i = e?.dxfName ?? t ?? n;
		W(i, e?.cppName ?? i, e?.appName ?? "ObjectDBX Classes", r, e?.dwgVersion, e?.maintVersion);
	}, sn = $t ? W("IMAGE", "AcDbRasterImage", "ISM", !0) : 0, cn = $t ? W("IMAGEDEF", "AcDbRasterImageDef", "ISM", !1) : 0, ln = $t ? W("WIPEOUT", "AcDbWipeout", "ISM", !0) : 0, un = en ? W("LIGHT", "AcDbLight", "ISM", !0) : 0, dn = tn || n >= 2e3 && !!o.tableStyles?.length, fn = nn || n >= 2e3 && !!o.mleaderStyles?.length, pn = tn ? W("ACAD_TABLE", "AcDbTable", "ISM", !0) : 0, mn = dn ? W("TABLESTYLE", "AcDbTableStyle", "ObjectDBX Classes", !1) : 0, hn = nn ? W("MULTILEADER", "AcDbMLeader", "ISM", !0) : 0, gn = fn ? W("MLEADERSTYLE", "AcDbMLeaderStyle", "ACDB_MLEADERSTYLE_CLASS", !1) : 0, _n = (e, t) => {
		let n = /* @__PURE__ */ new Set();
		return (e?.some((e) => /^standard$/i.test(e.name)) ? [...e] : [t, ...e ?? []]).filter((e) => !n.has(e.name.toLowerCase()) && !!n.add(e.name.toLowerCase()));
	}, vn = dn ? _n(o.tableStyles, { name: "Standard" }) : [], yn = fn ? _n(o.mleaderStyles, { name: "Standard" }) : [], bn = dn ? m(b("ACAD_TABLESTYLE")) : 0, xn = fn ? m(b("ACAD_MLEADERSTYLE")) : 0, Sn = /* @__PURE__ */ new Map();
	for (let e of vn) Sn.set(e.name.toLowerCase(), m(e.handle));
	let Cn = /* @__PURE__ */ new Map();
	for (let e of yn) Cn.set(e.name.toLowerCase(), m(e.handle));
	let wn = (e) => Sn.get((e ?? "").toLowerCase()) ?? Sn.get("standard") ?? 0, Tn = (e) => Cn.get((e ?? "").toLowerCase()) ?? Cn.get("standard") ?? 0, En = (e) => e.type === "mtext" && !!e.xdata?.some((e) => e.values.some((e) => "value" in e && e.code === 1e3 && e.value === "ACAD_MTEXT_COLUMNS_BEGIN")), Dn = n >= 14 && n < 2007 ? [
		st,
		lt,
		...z.map((e) => ut.get(e))
	].flat().filter((e) => En(e) || e.type === "table") : [], On = () => n <= 14 ? W("XRECORD", "AcDbXrecord", "ObjectDBX Classes", !1) : 79, kn = Dn.length ? d() : 0, An = [...new Set(Qt.filter((e) => e.type === "underlay").map((e) => e.underlayKind))].sort(), jn = /* @__PURE__ */ new Map();
	An.forEach((e) => {
		let t = e.charAt(0).toUpperCase() + e.slice(1);
		jn.set(e, {
			ent: W(e.toUpperCase() + "UNDERLAY", `AcDb${t}Reference`, "ISM", !0),
			def: W(e.toUpperCase() + "DEFINITION", `AcDb${t}Definition`, "ISM", !1)
		});
	});
	let G = o.geoData, Mn = G ? W("GEODATA", "AcDbGeoData", "ISM", !1) : 0, Nn = G ? d() : 0;
	for (let e of Qt) e.type === "proxy" && on(e.appClass, e.sourceType, "ACAD_PROXY_ENTITY", !0), e.type === "unknown" && (e.data || e.graphicsData || rt(e)) && e.typeCode === void 0 && on(e.appClass, e.sourceType, "ACAD_PROXY_ENTITY", !0);
	let Pn = o.proxyObjects ?? [];
	for (let e of Pn) on(e.appClass, e.sourceType, "ACAD_PROXY_OBJECT", !1);
	let Fn = Pn.map((e) => m(e.handle)), In = /* @__PURE__ */ new Set([
		"VISUALSTYLE",
		"MLEADERSTYLE",
		"ACDB_BLOCKREPRESENTATION_DATA",
		"ACDB_DYNAMICBLOCKPURGEPREVENTER_VERSION",
		"ACAD_EVALUATION_GRAPH",
		"BLOCKVISIBILITYPARAMETER",
		"BLOCKGRIPLOCATIONCOMPONENT",
		"TABLEGEOMETRY",
		"TABLECONTENT",
		"LINKEDTABLEDATA",
		"FORMATTEDTABLEDATA",
		"FIELDLIST"
	]), K = (e) => (e.appClass?.dxfName ?? e.sourceType ?? "").toUpperCase(), Ln = (e) => (K(e) === "DICTIONARY" || K(e) === "ACDBDICTIONARYWDFLT") && e.entries !== void 0, Rn = (e) => K(e) === "ACDBDICTIONARYWDFLT" && e.entries !== void 0, zn = (e) => K(e) === "XRECORD", Bn = /* @__PURE__ */ new Map();
	for (let e of o.xrecords ?? []) e.handle && Bn.set(e.handle.toUpperCase(), e.values);
	let Vn = (e, t) => {
		let n = 0;
		for (let r of e) {
			if (n += 2, "point" in r) {
				n += 24;
				continue;
			}
			let e = String(r.value);
			switch (Se(r.code)) {
				case "string":
					n += t >= 2007 ? 2 + 2 * e.length : 3 + e.length;
					break;
				case "real":
					n += 8;
					break;
				case "point":
					n += 24;
					break;
				case "int8":
				case "bool":
					n += 1;
					break;
				case "int16":
					n += 2;
					break;
				case "int32":
					n += 4;
					break;
				case "int64":
					n += 8;
					break;
				case "binary":
					n += 1 + (e.replace(/[^0-9a-fA-F]/g, "").length >> 1);
					break;
				case "handle":
					n += 8;
					break;
				default: return -1;
			}
		}
		return n;
	}, Hn = /* @__PURE__ */ new Map(), Un = (e) => {
		if (!zn(e) || !e.handle || !e.data || e.encoding === void 0) return;
		let t = Hn.get(e);
		if (t === void 0) {
			let n = Bn.get(e.handle.toUpperCase()), r = -1;
			try {
				r = new te(V(e.data)).bl();
			} catch {}
			t = n && r >= 0 && Vn(n, e.encoding) === r ? n : null, Hn.set(e, t);
		}
		return t ?? void 0;
	}, Wn = (e) => e.data !== void 0 && e.encoding !== Ce(n) && !Ln(e) && K(e) !== "ACDBPLACEHOLDER" && Un(e) === void 0, Gn = (e) => {
		let t = e.appClass?.appName ?? "";
		return /^(ObjectDBX Classes|ISM|SCENEOE)$/i.test(t) || /^"?WipeOut/i.test(t) || /^ACDB_\w+_CLASS$/i.test(t);
	}, Kn = (e) => Wn(e) && Gn(e) && e.typeCode === void 0 && !(n === 2007 && (K(e).startsWith("ACDBASSOC") || K(e).startsWith("ASSOC") || /DEPENDENCYBODY$/.test(K(e)))), qn = (e) => Wn(e) && !Kn(e), Jn = (e) => rt(e) && /^ACDB(SECTION|DETAIL)VIEWSTYLE$/.test(K(e)), Yn = (e) => {
		let t = [], n = !1, r = !1, i = !1, a = !1;
		for (let [o, s] of e) {
			if (o === 102) {
				n = s.trim().startsWith("{");
				continue;
			}
			if (!n && !(o === 0 || o === 5 || o >= 1e3)) {
				if (o === 100) {
					if (r = !0, a = /^AcDbEntity$/i.test(s.trim()), a) continue;
				} else if (a) continue;
				if (o === 330 && !r && !i) {
					i = !0;
					continue;
				}
				t.push([o, s]);
			}
		}
		return t;
	}, Xn = {
		R13: 19,
		R14: 21,
		R2000: 23,
		R2004: 25,
		R2007: 27,
		R2010: 29,
		R2013: 31,
		R2018: 33
	}, Zn = {
		R13: 14,
		R14: 14,
		R2000: 2e3,
		R2004: 2004,
		R2007: 2007,
		R2010: 2018,
		R2013: 2018,
		R2018: 2018
	}, Qn = (e) => {
		let t = o.header.version ?? "";
		return e !== void 0 && Zn[t] === e ? Xn[t] : e === 14 ? 21 : e === 2e3 ? 23 : e === 2004 ? 25 : e === 2007 ? 27 : 33;
	}, $n = n <= 14 ? 21 : n === 2e3 ? 23 : n === 2004 ? 25 : n === 2007 ? 27 : 33, er = Xn[o.header.version ?? ""] ?? $n, tr = /* @__PURE__ */ new Set(/* @__PURE__ */ "2dwireframe.3dwireframe.3d hidden.basic.realistic.conceptual.dim.brighten.thicken.linepattern.facepattern.colorchange.flat.flatwithedges.gouraud.gouraudwithedges.jitteroff.overhangoff.edgecoloroff.shaded.shaded with edges.shades of gray.sketchy.x-ray.hidden.wireframe".split(".")), nr = 0, rr = (e) => {
		let t = K(e);
		return In.has(t) || t.startsWith("BLOCK") || t.startsWith("ACDB_DYNAMICBLOCK") || t.startsWith("ACDBASSOC") || t.startsWith("ASSOC") || /DEPENDENCYBODY$/.test(t) || Ln(e) || zn(e);
	}, ir = (e) => {
		let t = K(e), r = Wn(e);
		if (r && n < 2e3 || r && n === 2004 && !Kn(e)) return e.sourceType ?? e.name ?? "sealed object";
		if (n === 2007 && r && !Kn(e) && /OBJECTCONTEXTDATA/.test(t)) return e.sourceType ?? t;
		if (n >= 2018 && o.header.version === "R2010" && !a.has(e) && (t === "VISUALSTYLE" || t.startsWith("ACDBASSOC") || t.startsWith("ASSOC") || /DEPENDENCYBODY$/.test(t))) return `${e.sourceType ?? t} (R2010 record; its R2013 spelling differs)`;
		if (!s) {
			if (In.has(t) || t.startsWith("BLOCK") || t.startsWith("ACDB_DYNAMICBLOCK") || t.startsWith("ACDBASSOC") || t.startsWith("ASSOC") || /DEPENDENCYBODY$/.test(t)) return e.sourceType ?? t;
			if (zn(e)) return `${e.sourceType ?? t} (its data may name handles a renumbering cannot follow)`;
		}
		return null;
	}, ar = (e) => !!e.data || e.typeCode !== void 0 || Ln(e) || e.encoding !== void 0 && !!e.xdata?.length && !!(e.appClass?.dxfName ?? e.sourceType) || rt(e), or = /* @__PURE__ */ new Set([
		"ACAD_LAYOUT",
		"ACAD_GROUP",
		"ACAD_MLINESTYLE",
		"ACAD_TABLESTYLE",
		"ACAD_MLEADERSTYLE",
		"ACDB_RECOMPOSE_DATA",
		"ACAD_GEOGRAPHICDATA",
		"ACDBVARIABLEDICTIONARY"
	]), sr = [], cr = (e) => sr.some((t) => t.name.toLowerCase() === e.toLowerCase());
	for (let e of o.variables ?? []) e.name && !cr(e.name) && sr.push(e);
	let lr = /* @__PURE__ */ new Set();
	for (let e of o.unknownObjects ?? []) {
		if (K(e) !== "DICTIONARYVAR" || !e.name || !e.tags?.length || e.dictPath?.length !== 1 || !/^acdbvariabledictionary$/i.test(e.dictPath[0])) continue;
		let t = (t) => e.tags.find((e) => e[0] === t)?.[1], n = t(1);
		if (n === void 0 || (lr.add(e), cr(e.name))) continue;
		let r = Number(t(280) ?? 0);
		sr.push({
			name: e.name,
			value: n,
			...r ? { schema: r } : {},
			...e.handle ? { handle: e.handle } : {},
			...e.xdict ? { xdict: e.xdict } : {}
		});
	}
	let ur = (e, t, n = !1) => {
		let r = o.header.vars?.[e];
		typeof r == "number" && Number.isFinite(r) && !cr(e) && (t === void 0 || r !== t) && sr.push({
			name: e,
			value: n ? r.toFixed(6) : String(r)
		});
	};
	if (n < 2004) for (let e of [
		"DIMASSOC",
		"INDEXCTL",
		"XCLIPFRAME",
		"SORTENTS"
	]) ur(e);
	if (n < 2007 && (ur("SOLIDHIST"), ur("PSOLWIDTH", .25, !0), ur("PSOLHEIGHT", 4, !0)), n >= 2007) for (let [e, t] of [["LAYEREVAL", "1"], ["LAYERNOTIFY", "15"]]) cr(e) || sr.push({
		name: e,
		value: t
	});
	let dr = n >= 2e3 && sr.length > 0;
	n < 2e3 && sr.length && i.push(`${sr.length} drawing variables (AcDbVariableDictionary needs R2000 or later)`);
	let fr = dr ? m(b("ACDBVARIABLEDICTIONARY")) : 0, pr = sr.map((e) => dr ? m(e.handle) : 0), mr = dr ? W("DICTIONARYVAR", "AcDbDictionaryVar", "ObjectDBX Classes", !1) : 0, hr = (o.unknownObjects ?? []).filter((e) => K(e) === "DICTIONARY" && e.dictPath?.length === 0 && e.name && or.has(e.name.toUpperCase()) || lr.has(e) ? !1 : n < 2e3 && Rn(e) ? (i.push("ACDBDICTIONARYWDFLT (needs R2000 or later)"), !1) : n < 2e3 && K(e) === "ACDBPLACEHOLDER" ? !1 : ar(e) ? !0 : (i.push(`${e.sourceType ?? "sealed object"} (no retained record bits)`), !1)), gr = /* @__PURE__ */ new Map();
	for (let e of hr) e.handle && gr.set(e.handle.toUpperCase(), e);
	let _r = /* @__PURE__ */ new Set(["0"]);
	{
		let e = (e) => {
			e && _r.add(e.toUpperCase());
		}, t = (t) => {
			for (let n of t ?? []) if (e(n.handle), n.type === "insert") for (let t of n.attributes ?? []) e(t.handle);
		};
		t(o.entities), t(o.paperSpace);
		for (let n of Object.values(o.blocks)) e(n.handle), t(n.entities);
		e(qe?.blockHandle), e(Je?.blockHandle), e(b("MODEL_SPACE")), e(b("PAPER_SPACE"));
		for (let t of o.proxyObjects ?? []) e(t.handle);
		for (let t of o.layers) e(t.handle);
		for (let t of o.linetypes) e(t.handle);
		for (let t of o.textStyles) e(t.handle);
		for (let t of vn) e(t.handle);
		for (let t of yn) e(t.handle);
		if (n >= 2e3) for (let t of [
			qe,
			Je,
			...Xe.map((e) => e.meta)
		]) e(t?.handle);
		for (let t of je) e(t.handle);
		e(j?.handle);
		for (let t of Oe) e(t.handle);
		for (let t of Ne) e(t.handle);
		for (let t of Be) e(t.handle);
		for (let t of Fe) e(t.handle);
		if (dr) for (let t of sr) e(t.handle);
	}
	{
		let e = (e, t) => {
			let n = e ? parseInt(e, 16) : NaN;
			!e || !Number.isFinite(n) || n <= 0 || (p.has(n) || p.set(n, t), _r.add(e.toUpperCase()));
		};
		e(b("NOD") ?? hr.find((e) => e.dictPath?.length === 0 && e.ownerHandle)?.ownerHandle, O), n >= 2e3 && e(b("ACAD_LAYOUT"), A), e(b("ACAD_GROUP"), ie), e(b("ACAD_MLINESTYLE"), k), dn && e(b("ACAD_TABLESTYLE"), bn), fn && e(b("ACAD_MLEADERSTYLE"), xn), dr && e(b("ACDBVARIABLEDICTIONARY"), fr), e(b("BLOCK_CONTROL"), x), e(b("LAYER_CONTROL"), S), e(b("STYLE_CONTROL"), C), e(b("LTYPE_CONTROL"), ee), e(b("VIEW_CONTROL"), w), e(b("UCS_CONTROL"), ne), e(b("VPORT_CONTROL"), T), e(b("APPID_CONTROL"), E), e(b("DIMSTYLE_CONTROL"), D), n <= 2e3 && e(b("VX_CONTROL"), re);
	}
	let vr = new Set(hr), yr = /* @__PURE__ */ new Map(), br = /* @__PURE__ */ new Set(), xr = (e) => {
		let t = e.toUpperCase(), n = gr.get(t);
		return n ? vr.has(n) : _r.has(t);
	}, Sr = (e, t, n = !1) => {
		vr.delete(e), yr.set(e, t), n && br.add(e);
	}, Cr = (e, t) => {
		if (!xr(t.handle)) return !1;
		if (e.dictPath === void 0) return !0;
		let n = gr.get(t.handle.toUpperCase());
		return !n || !qn(n) && !Jn(n);
	}, wr = (e) => {
		let t = [];
		for (let [n, r] of Yn(e.tags ?? [])) {
			if (Se(n) !== "handle") continue;
			let e = n >= 390 ? 5 : n >= 360 ? 3 : n >= 350 ? 2 : n >= 340 ? 5 : 4;
			t.push({
				code: e,
				value: r.trim().toUpperCase()
			});
		}
		return t;
	};
	for (let e of hr) {
		if (K(e) === "VISUALSTYLE" && (Wn(e) || n >= 2018 && o.header.version === "R2010") && tr.has((e.name ?? "").toLowerCase())) {
			nr++, Sr(e, "VISUALSTYLE (the reference's standard set)", !0);
			continue;
		}
		let t = ir(e);
		t !== null && Sr(e, t);
	}
	let Tr = () => {
		for (let e = !0; e;) {
			e = !1;
			for (let t of [...vr]) {
				let n = K(t), r = t.ownerHandle?.toUpperCase(), i = r ? gr.get(r) : void 0, a = !!r && xr(r), o = !!i && Ln(i) && i.dictPath !== void 0, s = null, c = !1;
				i && !vr.has(i) && !o ? (s = `${t.sourceType ?? "sealed object"} (its owner stays home)`, c = !0) : Ln(t) ? (t.entries ?? []).length && !(t.entries ?? []).some((e) => Cr(t, e)) ? (s = `${t.sourceType ?? n} (nothing it lists is written)`, c = !0) : a || (s = `${t.sourceType ?? n} (extension dictionary of an object not written)`) : qn(t) && o && rr(t) ? s = `${t.sourceType ?? n} (of another generation, listed by one of the reference's own dictionaries)` : !a && rr(t) ? s = zn(t) ? `${t.sourceType ?? n} (its owner is not written)` : t.sourceType ?? n : (t.refs ?? (rt(t) ? wr(t) : [])).every((e) => e.code !== 3 && e.code !== 5 || e.value === "0" || xr(e.value)) || (s = t.sourceType ?? "sealed object"), s !== null && (Sr(t, s, c), e = !0);
			}
		}
	};
	Tr();
	let Er = (e) => {
		let t = o.blocks[e]?.handle?.toUpperCase();
		if (t) return hr.find((e) => Ln(e) && e.ownerHandle?.toUpperCase() === t);
	}, Dr = (e, t) => {
		let n = e?.entries?.find((e) => e.name.toUpperCase() === t.toUpperCase());
		return n ? gr.get(n.handle.toUpperCase()) : void 0;
	}, Or = (e) => {
		let t = Er(e);
		if (!t || !vr.has(t)) return !1;
		let n = Dr(t, "ACAD_ENHANCEDBLOCK");
		return !!n && vr.has(n) && K(n) === "ACAD_EVALUATION_GRAPH";
	}, kr = z.filter((e) => !!o.blocks[e]?.visibilityStates?.length && !Or(e)), Ar = /* @__PURE__ */ new Set();
	if (n >= 2e3) {
		let e = (e) => {
			let t = e ? [e] : [];
			for (; t.length;) {
				let e = t.pop(), n = e.handle?.toUpperCase();
				if (n && !Ar.has(n)) {
					Ar.add(n);
					for (let n of e.refs ?? []) {
						let e = n.code === 3 ? gr.get(n.value.toUpperCase()) : void 0;
						e && t.push(e);
					}
				}
			}
		}, t = new Set(kr.map((e) => o.blocks[e].handle?.toUpperCase()).filter((e) => !!e));
		for (let t of kr) {
			let n = Er(t);
			e(Dr(n, "ACAD_ENHANCEDBLOCK")), e(Dr(n, "AcDbDynamicBlockRoundTripPurgePreventer"));
		}
		let n = /* @__PURE__ */ new Set();
		for (let r of hr) K(r) === "ACDB_DYNAMICBLOCKPURGEPREVENTER_VERSION" && (r.refs ?? []).some((e) => e.code === 5 && t.has(e.value.toUpperCase())) && (e(r), r.ownerHandle && n.add(r.ownerHandle.toUpperCase()));
		for (let t of hr) K(t) === "ACAD_EVALUATION_GRAPH" && t.ownerHandle && n.has(t.ownerHandle.toUpperCase()) && e(t);
		for (let e of [...vr]) e.handle && Ar.has(e.handle.toUpperCase()) && Sr(e, `${e.sourceType ?? K(e)} (superseded by the rebuilt graph)`, !0);
		Tr();
	}
	for (let e of hr) vr.has(e) || br.has(e) || e.handle && Ar.has(e.handle.toUpperCase()) || i.push(yr.get(e));
	nr && i.push(`${nr} VISUALSTYLE records (the reference's standard set, in another generation's spelling; recreated on open)`);
	let jr = hr.filter((e) => vr.has(e));
	for (let e of jr) e.typeCode === void 0 && on(e.appClass, e.sourceType, "ACAD_PROXY_OBJECT", !1), n <= 14 && zn(e) && On();
	let Mr = jr.map((e) => m(e.handle)), Nr = (() => {
		let e = jr.findIndex((e) => Rn(e) && e.dictPath?.length === 0 && (e.name ?? "").toUpperCase() === "ACAD_PLOTSTYLENAME");
		return e >= 0 ? Mr[e] : 0;
	})(), Pr = /* @__PURE__ */ new Map();
	jr.forEach((e, t) => {
		e.handle && Pr.set(e.handle.toUpperCase(), Mr[t]);
	});
	let Fr = (e) => {
		if (!e) return;
		let t = parseInt(e, 16);
		if (!Number.isFinite(t) || t <= 0) return;
		let n = gr.get(e.toUpperCase());
		return n ? vr.has(n) ? Pr.get(e.toUpperCase()) : void 0 : p.get(t);
	}, Ir = (e) => {
		let t = Fr(e.ownerHandle);
		if (t === void 0 || !e.ownerHandle) return;
		let n = e.handle ? gr.get(e.handle.toUpperCase()) : void 0;
		if (n && (qn(n) || Jn(n))) {
			let t = gr.get(e.ownerHandle.toUpperCase());
			if (t && Ln(t) && t.dictPath !== void 0) return;
		}
		return t;
	}, Lr = (e) => {
		let t = Ir(e);
		return t === O && e.handle && q.get(O)?.p.handle === e.handle ? !1 : t === void 0 || t === O;
	}, q = /* @__PURE__ */ new Map();
	jr.forEach((e, t) => {
		if (!Ln(e) || !e.ownerHandle || e.dictPath !== void 0) return;
		let n = gr.get(e.ownerHandle.toUpperCase());
		if (n && Ln(n) && (n.entries ?? []).some((t) => t.handle.toUpperCase() === e.handle?.toUpperCase())) return;
		let r = Ir(e);
		r !== void 0 && q.set(r, {
			p: e,
			h: Mr[t]
		});
	});
	let Rr = /* @__PURE__ */ new Set();
	jr.forEach((e, t) => {
		Ln(e) && Rr.add(Mr[t]);
	});
	let zr = /* @__PURE__ */ new Map(), Br = (e, t, n) => {
		let r = zr.get(e) ?? [];
		r.push([t, n]), zr.set(e, r);
	}, Vr = kr.length > 0 && n >= 2e3, Hr = Vr ? W("BLOCKVISIBILITYPARAMETER", "AcDbBlockVisibilityParameter", "ObjectDBX Classes", !1) : 0, Ur = Vr ? W("ACAD_EVALUATION_GRAPH", "AcDbEvalGraph", "ObjectDBX Classes", !1) : 0, Wr = Vr ? W("BLOCKVISIBILITYGRIP", "AcDbBlockVisibilityGrip", "ObjectDBX Classes", !1) : 0, Gr = Vr ? W("BLOCKGRIPLOCATIONCOMPONENT", "AcDbBlockGripExpr", "ObjectDBX Classes", !1) : 0, Kr = Vr ? W("ACDB_DYNAMICBLOCKPURGEPREVENTER_VERSION", "AcDbDynamicBlockPurgePreventer", "ObjectDBX Classes", !1) : 0, qr = (e) => e.some((t, n) => n > 0 && t < e[n - 1]), Jr = [];
	if (s) {
		let e = [
			[L, pt],
			[R, mt],
			...z.map((e) => [B.get(e), ht.get(e)])
		];
		for (let [t, r] of e) if (qr(r)) {
			if (n <= 14) {
				i.push("draw order (SORTENTSTABLE needs R2000 or later)");
				continue;
			}
			Jr.push({
				block: t,
				hs: r
			});
		}
	}
	let Yr = Jr.length ? W("SORTENTSTABLE", "AcDbSortentsTable", "ObjectDBX Classes", !1) : 0, Xr = /* @__PURE__ */ new Map();
	for (let e of Jr) {
		let t = q.get(e.block)?.h ?? d(), n = d();
		Xr.set(e.block, {
			dict: t,
			table: n
		}), Rr.has(t) && Br(t, "ACAD_SORTENTS", n);
	}
	let Zr = /* @__PURE__ */ new Map();
	if (Vr) for (let e of kr) {
		let t = B.get(e), n = {
			dict: Xr.get(t)?.dict ?? q.get(t)?.h ?? d(),
			graph: d(),
			param: d(),
			grip: d(),
			gripX: d(),
			gripY: d(),
			purge: d()
		};
		Zr.set(t, n), Rr.has(n.dict) && (Br(n.dict, "ACAD_ENHANCEDBLOCK", n.graph), Br(n.dict, "AcDbDynamicBlockRoundTripPurgePreventer", n.purge));
	}
	let Qr = /* @__PURE__ */ new Map(), $r = /* @__PURE__ */ new Map(), ei = (e) => {
		let t = (e.raw ?? e.text).replace(/\n/g, "\\P");
		if (n >= 2018) return t;
		let r = e.height > 0 ? e.height : 5, i = _t(t, 2004, r);
		return n <= 2e3 ? _t(i, 2e3, r) : i;
	};
	if (n < 2018) {
		let e = (e) => {
			let t = 0;
			for (let n = 0; n < e.length; n++) t += e.charCodeAt(n) * (n + 1);
			return t;
		}, t = (e) => n >= 2007 ? e : H(e), r = (e) => {
			let t = [];
			for (let n = 0; n < e.length; n += 250) t.push({
				code: 1,
				value: e.slice(n, n + 250)
			});
			return t;
		}, i = (e) => e.map((e) => e.code === 1 && "value" in e ? String(e.value) : "").join("");
		for (let [a, o] of dt) {
			if (a.type !== "mtext") continue;
			let s = a.height > 0 ? a.height : 5, c = (a.raw ?? a.text).replace(/\n/g, "\\P"), l = _t(c, 2004, s), u = ei(a), f = a.xdict ? gr.get(a.xdict.toUpperCase()) : void 0, p = (e) => {
				let t = f?.entries?.find((t) => t.name.toUpperCase() === e), n = t ? Bn.get(t.handle.toUpperCase()) : void 0;
				return t && n ? {
					handle: t.handle,
					text: i(n)
				} : void 0;
			}, m = p("ACAD_MTEXT_2008_RT"), h = p("ACAD_MTEXT_RT"), g = l === c ? m?.text : c, _ = u === l ? n <= 2e3 ? h?.text : void 0 : l;
			if (!g && !_) continue;
			let v = (e) => !!e && !!f && vr.has(f) && xr(e.handle), y = [];
			if (g && !v(m) && y.push([
				"ACAD_MTEXT_2008_RT",
				d(),
				[{
					code: 40,
					value: e(t(_ ?? u))
				}, ...r(g)]
			]), _ && !v(h) && y.push([
				"ACAD_MTEXT_RT",
				d(),
				[{
					code: 40,
					value: e(t(u))
				}, ...r(_)]
			]), !y.length) continue;
			let b = q.get(o), x = b?.h ?? d();
			if (b) for (let [e, t] of y) Br(x, e, t);
			else Qr.set(o, x);
			$r.set(a, {
				dict: x,
				fresh: !b,
				entries: y
			});
		}
		$r.size && !kn && (kn = d());
	}
	let ti = /* @__PURE__ */ new Map();
	function ni() {
		return o.entities;
	}
	function ri() {
		return o.paperSpace ?? [];
	}
	let ii = [], ai = (e, t, r) => {
		n >= 2004 && e.rs(0), e.rl(t.dataBits ?? 0), t.data && t.dataBits && e.putBits(V(t.data), t.dataBits), e.rl(t.strBits ?? 0), t.strData && t.strBits && e.putBits(V(t.strData), t.strBits), n >= 2007 && e.t("cn:" + (r ?? t.appClass?.cppName ?? "AcDbObject"));
	}, oi = (e, t, r, i, a, o) => {
		if (e.bl(t), n === 2004 && e.t("cn:" + r + "\0"), n >= 2018) e.bl(i >>> 0), e.bl(a >>> 0);
		else {
			let t = a > 65535 ? a >>> 16 & 65535 : a & 65535;
			e.bl((t << 16 | i & 65535) >>> 0);
		}
		n >= 2e3 && e.b(+!!o);
	}, si = (e, t) => {
		n >= 2007 && e.t("cn:" + t);
	}, ci = (e, t, n, r, i) => {
		let a = V(t);
		if (r && i !== void 0 && n >= 68) {
			let t = new te(a, 0, n), r = t.bl(), o = t.pos === 34 ? t.bl() : -1, s = t.pos;
			if ((r === 499 || r === 498) && o >= 500 && s === 68) {
				e.bl(r), e.bl(i);
				for (let t = 68; t < n; t++) e.b(a[t >> 3] >> 7 - (t & 7) & 1);
				return;
			}
		}
		e.putBits(a, n);
	}, li = (e, t) => {
		t.data && t.dataBits && e.putBits(V(t.data), t.dataBits), !((t.encoding ?? 0) < 2007) && (n >= 2007 ? t.strData && t.strBits && e.strTarget?.putBits(V(t.strData), t.strBits) : t.strData && t.strBits ? (e.putBits(V(t.strData), t.strBits), pi(e, t.strBits), e.b(1)) : e.b(0));
	}, ui = (e, t, r, i) => {
		let a = Yn(t.tags ?? []), o = wr(t), s = (e) => Number(e.trim()) || 0;
		e.bl(r), e.bl(i);
		for (let t = 0; t < a.length; t++) {
			let [r, i] = a[t];
			switch (Se(r)) {
				case "string":
					e.bs(r), n >= 2007 ? e.t(i) : e.t(H(i) + "\0");
					break;
				case "real":
					e.bs(r), e.bd(s(i));
					break;
				case "point": {
					let n = r >= 10 && r <= 18 || r >= 110 && r <= 119 || r >= 210 && r <= 219, o = 0, c = 0;
					n && (t + 1 < a.length && a[t + 1][0] === r + 10 && (o = s(a[++t][1])), t + 1 < a.length && a[t + 1][0] === r + 20 && (c = s(a[++t][1]))), e.bs(r), e.bd(s(i)), e.bd(o), e.bd(c);
					break;
				}
				case "int16":
				case "int8":
				case "bool":
					e.bs(r), e.bs(s(i) & 65535);
					break;
				case "int32":
					e.bs(r), e.bl(s(i) >>> 0);
					break;
				case "int64":
					e.bs(r), e.bll(s(i));
					break;
				case "binary": {
					let t = i.replace(/[^0-9a-fA-F]/g, ""), n = t.length >> 1;
					e.bs(r), e.bl(n);
					for (let r = 0; r < n; r++) e.rc(parseInt(t.slice(r * 2, r * 2 + 2), 16));
					break;
				}
				case "handle": e.bs(r);
			}
		}
		return e.bs(0), (e) => {
			for (let t of o) e.h(t.code, Fr(t.value) ?? 0);
		};
	}, di = (e, t) => {
		let r = new P();
		for (let e of t) {
			if ("point" in e) {
				r.rs(e.code), r.rd(e.point.x), r.rd(e.point.y), r.rd(e.point.z ?? 0);
				continue;
			}
			let t = e.value, i = typeof t == "number" ? t : Number(t) || 0;
			switch (Se(e.code)) {
				case "string":
					if (r.rs(e.code), n >= 2007) {
						let e = String(t);
						r.rs(e.length);
						for (let t = 0; t < e.length; t++) r.rs(e.charCodeAt(t));
					} else {
						let e = H(String(t));
						r.rs(e.length), r.rc(30);
						for (let t = 0; t < e.length; t++) r.rc(e.charCodeAt(t) & 255);
					}
					break;
				case "real":
					r.rs(e.code), r.rd(i);
					break;
				case "point":
					r.rs(e.code), r.rd(i), r.rd(0), r.rd(0);
					break;
				case "int8":
				case "bool":
					r.rs(e.code), r.rc(i & 255);
					break;
				case "int16":
					r.rs(e.code), r.rs(i & 65535);
					break;
				case "int32":
					r.rs(e.code), r.rl(i >>> 0);
					break;
				case "int64":
					r.rs(e.code), r.rll(i);
					break;
				case "binary": {
					let n = String(t).replace(/[^0-9a-fA-F]/g, ""), i = Math.min(255, n.length >> 1);
					r.rs(e.code), r.rc(i);
					for (let e = 0; e < i; e++) r.rc(parseInt(n.slice(e * 2, e * 2 + 2), 16));
					break;
				}
				case "handle": r.rs(e.code), r.rll(g(String(t)));
			}
		}
		let i = r.bytes();
		e.bl(i.length), e.raw(i);
	}, fi = (e) => {
		if (n < 2007) return null;
		let t = new P();
		return t.utf16 = !0, e.utf16 = !0, e.strTarget = t, t;
	}, pi = (e, t) => {
		t >= 32768 ? (e.rs(t >> 15), e.rs(t & 32767 | 32768)) : e.rs(t);
	}, mi = (e, t) => {
		if (!t) return e.pos;
		e.strTarget = void 0;
		let n = t.pos;
		return n === 0 ? (e.b(0), e.pos) : (e.appendBits(t), pi(e, n), e.b(1), e.pos);
	}, hi = (e, t) => {
		if (n >= 2018) return t <= 255 ? (e.bb(0), e.rc(t)) : t >= 496 && t <= 751 ? (e.bb(1), e.rc(t - 496)) : (e.bb(2), e.rs(t)), -1;
		if (e.bs(t), n <= 14) return -1;
		let r = e.pos;
		return e.rl(0), r;
	}, gi = (e, t, r) => {
		e.align(), ii.push({
			handle: t,
			bytes: e.bytes(),
			handleBits: n >= 2018 ? e.pos - r : void 0
		});
	}, J = (e, t, r, i, a = 0, o, s = 0) => {
		let c = new P(), l = hi(c, e), u = fi(c);
		c.h(0, t), Ci(c, o), n <= 14 && (l = c.pos, c.rl(0)), c.bl(s), n >= 2004 && c.b(+!a), n >= 2018 && c.b(0), r(c);
		let d = mi(c, u);
		l >= 0 && c.patchRl(l, d), i(c), gi(c, t, d);
	}, Y = (e, r, i, a, o, s, c) => {
		let l = new P(), u = hi(l, e), d = fi(l);
		l.h(0, r), wi(l, i), c && c.length ? (l.b(1), n <= 2007 ? l.rl(c.length) : l.bll(c.length), l.raw(c)) : l.b(0), n <= 14 && (u = l.pos, l.rl(0)), l.bb(a.entmode);
		let f = [...Vt.get(r) ?? []];
		for (let e of i.reactors ?? []) {
			let t = Fr(e);
			t !== void 0 && !f.includes(t) && f.push(t);
		}
		l.bl(f.length);
		let p = i.linetype && !/^bylayer$/i.test(i.linetype) ? /^byblock$/i.test(i.linetype) ? 1 : /^continuous$/i.test(i.linetype) ? 2 : 3 : 0;
		n <= 14 && l.b(+(p === 0));
		let m = q.get(r)?.h ?? Qr.get(r) ?? 0;
		n >= 2004 && l.b(+!m), n <= 2002 && l.b(0), n >= 2018 && l.b(+!!a.hasDs), n >= 2004 && i.color.kind === "rgb" ? (l.bs(32768 | t(i.color.rgb) & 255), l.bl((3254779904 | i.color.rgb & 16777215) >>> 0)) : l.bs(Lt(i)), l.bd(i.linetypeScale ?? 1), n >= 2e3 && (l.bb(p), l.bb(0)), n >= 2007 && (l.bb(0), l.rc(0), n >= 2018 && (l.b(0), l.b(0), l.b(0))), l.bs(+!!i.invisible), n >= 2e3 && l.rc(It(i.lineweight)), o(l);
		let h = mi(l, d);
		u >= 0 && l.patchRl(u, h);
		let g = he.get(i.layer) ?? he.get("0") ?? [...he.values()][0];
		a.entmode === 0 && a.owner !== void 0 && l.h(4, a.owner);
		for (let e of f) l.h(4, e);
		(n < 2004 || m) && l.h(3, m), n <= 14 ? (l.h(5, g), p !== 0 && l.h(5, p === 1 ? ce : p === 2 ? De : Ee.get(i.linetype) ?? De), l.h(4, a.prev ?? 0), l.h(4, a.next ?? 0)) : (n < 2004 && (l.h(4, a.prev ?? 0), l.h(4, a.next ?? 0)), l.h(5, g), p === 3 && l.h(5, Ee.get(i.linetype) ?? De)), s?.(l), gi(l, r, h);
	}, _i = (e, t) => {
		n <= 14 ? e.bd(t) : e.bt(t);
	}, vi = (e, t, r, i) => {
		n <= 14 ? e.bd3(t, r, i) : e.be(t, r, i);
	}, X = (e) => {
		let t = e.extrusion;
		return t ? [
			t.x,
			t.y,
			t.z ?? 1
		] : [
			0,
			0,
			1
		];
	}, yi = {
		left: 0,
		center: 1,
		right: 2,
		aligned: 3,
		middle: 4,
		fit: 5
	}, bi = {
		baseline: 0,
		bottom: 1,
		middle: 2,
		top: 3
	}, xi = (e, t) => {
		let r = yi[t.halign ?? "left"] ?? 0, i = bi[t.valign ?? "baseline"] ?? 0, a = t.position.z ?? 0, o = t.widthFactor ?? 1, [s, c, l] = X(t);
		if (n <= 14) {
			let n = t.alignmentPoint ?? t.position;
			e.bd(a), e.rd(t.position.x), e.rd(t.position.y), e.rd(n.x), e.rd(n.y), e.bd3(s, c, l), e.bd(0), e.bd(t.oblique ?? 0), e.bd(t.rotation), e.bd(t.height > 0 ? t.height : 5), e.bd(o), e.t(H(t.text)), e.bs(0), e.bs(r), e.bs(i);
			return;
		}
		let u = 0;
		a === 0 && (u |= 1);
		let d = t.alignmentPoint;
		(!d || d.x === t.position.x && d.y === t.position.y) && (u |= 2), t.oblique || (u |= 4), t.rotation || (u |= 8), o === 1 && (u |= 16), u |= 32, r || (u |= 64), i || (u |= 128), e.rc(u), u & 1 || e.rd(a), e.rd(t.position.x), e.rd(t.position.y), u & 2 || (e.dd(d.x, t.position.x), e.dd(d.y, t.position.y)), e.be(s, c, l), e.bt(0), u & 4 || e.rd(t.oblique ?? 0), u & 8 || e.rd(t.rotation), e.rd(t.height > 0 ? t.height : 5), u & 16 || e.rd(o), e.t(H(t.text)), u & 64 || e.bs(r), u & 128 || e.bs(i);
	}, Si = (e) => {
		if (!("value" in e) || e.code !== 1005 && e.code !== 1003) return e;
		let t = String(e.value).toUpperCase(), n = At.get(t);
		return {
			code: e.code,
			value: n === void 0 ? "0" : n.toString(16).toUpperCase()
		};
	}, Ci = (e, t) => {
		for (let r of t ?? []) {
			let t = (r.appName || (r.appHandle ? "APP_" + r.appHandle.toUpperCase() : "ACAD")).toUpperCase(), i = Wt.get(t) ?? ae, a = Rt(r.values.map(Si), n);
			a.length && (e.bs(a.length), e.h(5, i), e.raw(a));
		}
		e.bs(0);
	}, wi = (e, t) => Ci(e, t.xdata), Ti = 0, Ei = (e, t, r) => {
		switch (e.type) {
			case "line":
				Y(19, t, e, r, (t) => {
					if (n <= 14) {
						t.bd3(e.start.x, e.start.y, e.start.z ?? 0), t.bd3(e.end.x, e.end.y, e.end.z ?? 0), _i(t, 0), vi(t, ...X(e));
						return;
					}
					let r = (e.start.z ?? 0) === 0 && (e.end.z ?? 0) === 0;
					t.b(+!!r), t.rd(e.start.x), t.dd(e.end.x, e.start.x), t.rd(e.start.y), t.dd(e.end.y, e.start.y), r || (t.rd(e.start.z ?? 0), t.dd(e.end.z ?? 0, e.start.z ?? 0)), _i(t, 0), vi(t, ...X(e));
				});
				return;
			case "point":
				Y(27, t, e, r, (t) => {
					t.bd3(e.position.x, e.position.y, e.position.z ?? 0), _i(t, 0), vi(t, ...X(e)), t.bd(0);
				});
				return;
			case "circle":
				Y(18, t, e, r, (t) => {
					t.bd3(e.center.x, e.center.y, e.center.z ?? 0), t.bd(e.radius), _i(t, 0), vi(t, ...X(e));
				});
				return;
			case "arc":
				Y(17, t, e, r, (t) => {
					t.bd3(e.center.x, e.center.y, e.center.z ?? 0), t.bd(e.radius), _i(t, 0), vi(t, ...X(e)), t.bd(e.startAngle), t.bd(e.endAngle);
				});
				return;
			case "ellipse":
				Y(35, t, e, r, (t) => {
					t.bd3(e.center.x, e.center.y, e.center.z ?? 0), t.bd3(e.majorAxis.x, e.majorAxis.y, e.majorAxis.z ?? 0);
					let n = e.extrusion ?? {
						x: 0,
						y: 0,
						z: 1
					};
					t.bd3(n.x, n.y, n.z ?? 1), t.bd(e.ratio), t.bd(e.startParam), t.bd(e.endParam);
				});
				return;
			case "ray":
			case "xline":
				Y(e.type === "ray" ? 40 : 41, t, e, r, (t) => {
					t.bd3(e.basePoint.x, e.basePoint.y, e.basePoint.z ?? 0);
					let n = e.direction ?? {
						x: 1,
						y: 0,
						z: 0
					};
					t.bd3(n.x, n.y, n.z ?? 0);
				});
				return;
			case "solid":
				Y(31, t, e, r, (t) => {
					_i(t, 0), t.bd(e.corners[0].z ?? 0);
					for (let n of e.corners) t.rd(n.x), t.rd(n.y);
					vi(t, ...X(e));
				});
				return;
			case "face3d":
				Y(28, t, e, r, (t) => {
					if (n <= 14) {
						for (let n of e.corners) t.bd3(n.x, n.y, n.z ?? 0);
						t.bs(e.invisibleEdges ?? 0);
						return;
					}
					let r = e.corners.every((e) => (e.z ?? 0) === 0), i = !e.invisibleEdges;
					t.b(+!!i), t.b(+!!r), t.rd(e.corners[0].x), t.rd(e.corners[0].y), r || t.rd(e.corners[0].z ?? 0);
					let [a, o, s] = [
						e.corners[0].x,
						e.corners[0].y,
						e.corners[0].z ?? 0
					];
					for (let n = 1; n < 4; n++) {
						let r = e.corners[n];
						t.dd(r.x, a), t.dd(r.y, o), t.dd(r.z ?? 0, s), a = r.x, o = r.y, s = r.z ?? 0;
					}
					i || t.bs(e.invisibleEdges ?? 0);
				});
				return;
			case "polyline": {
				let i = e.heavy === "3d" || e.vertices.some((e) => e.z !== void 0);
				if (e.heavy || i) {
					let a = e.fit && e.fit !== "curve" ? e.frame ?? [] : [], o = (t) => e.fit === "curve" ? +!!t.curveFit : e.fit ? 8 : 0, s = [
						...a.slice(0, 1).map((e) => ({
							v: e,
							f: 16
						})),
						...e.vertices.map((e) => ({
							v: e,
							f: o(e)
						})),
						...a.slice(1).map((e) => ({
							v: e,
							f: 16
						}))
					], c = s.map(() => d()), l = d(), u = e.fit === "quadratic" ? 5 : e.fit === "cubic" ? 6 : 0, f = +!!e.closed | (e.fit === "curve" ? 2 : e.fit ? 4 : 0) | (e.plineGen ? 128 : 0);
					Y(i ? 16 : 15, t, e, r, (t) => {
						i ? (t.rc(u), t.rc(f)) : (t.bs(f), t.bs(u), t.bd(0), t.bd(0), _i(t, 0), t.bd(e.elevation ?? 0), vi(t, ...X(e))), n >= 2004 && t.bl(s.length);
					}, (e) => {
						if (n < 2004) e.h(4, c[0] ?? 0), e.h(4, c[c.length - 1] ?? 0);
						else for (let t of c) e.h(4, t);
						e.h(3, l);
					});
					let p = (t) => ({
						type: "point",
						layer: e.layer,
						color: e.color,
						linetype: e.linetype,
						lineweight: e.lineweight,
						linetypeScale: e.linetypeScale,
						position: t
					});
					s.forEach(({ v: r, f: a }, o) => {
						let s = p({
							x: r.x,
							y: r.y,
							z: r.z ?? 0
						});
						Y(i ? 11 : 10, c[o], s, {
							entmode: 0,
							owner: t,
							prev: c[o - 1] ?? 0,
							next: c[o + 1] ?? 0
						}, (t) => {
							if (i) {
								t.rc(32 | a), t.bd3(r.x, r.y, r.z ?? 0);
								return;
							}
							t.rc(a | (r.tangent === void 0 ? 0 : 2)), t.bd3(r.x, r.y, e.elevation ?? 0);
							let o = r.startWidth ?? 0, s = r.endWidth ?? 0;
							o === s && o !== 0 ? t.bd(-o) : (t.bd(o), t.bd(s)), t.bd(r.bulge ?? 0), n >= 2010 && t.bl(r.id ?? 0), t.bd(r.tangent ?? 0);
						});
					}), Y(6, l, p({
						x: 0,
						y: 0,
						z: 0
					}), {
						entmode: 0,
						owner: t
					}, () => {});
					return;
				}
				Y(77, t, e, r, (t) => {
					let r = e.vertices.some((e) => e.bulge), i = e.vertices.some((e) => e.startWidth || e.endWidth), a = n >= 2010 && e.vertices.some((e) => e.id), o = 0;
					e.constantWidth && (o |= 4), e.elevation && (o |= 8), r && (o |= 16), i && (o |= 32), e.plineGen && (o |= 256), e.closed && (o |= 512), a && (o |= 1024), e.extrusion && (o |= 1), t.bs(o), e.constantWidth && t.bd(e.constantWidth), e.elevation && t.bd(e.elevation), e.extrusion && t.bd3(...X(e)), t.bl(e.vertices.length), r && t.bl(e.vertices.length), a && t.bl(e.vertices.length), i && t.bl(e.vertices.length);
					let s = 0, c = 0;
					if (e.vertices.forEach((e, r) => {
						r === 0 || n <= 14 ? (t.rd(e.x), t.rd(e.y)) : (t.dd(e.x, s), t.dd(e.y, c)), s = e.x, c = e.y;
					}), r) for (let n of e.vertices) t.bd(n.bulge ?? 0);
					if (a) for (let n of e.vertices) t.bl(n.id ?? 0);
					if (i) for (let n of e.vertices) t.bd(n.startWidth ?? 0), t.bd(n.endWidth ?? 0);
				});
				return;
			}
			case "text": {
				let i = e.attribute === "attdef", a = (t) => {
					if (!i) return;
					let r = "ATTD" + ++Ti;
					n >= 2018 && (t.rc(0), t.rc(1)), t.t(n <= 14 ? H(ki(r)) : r), t.bs(0), t.rc(+!!e.invisible | (e.constant ? 2 : 0)), n >= 2007 && t.b(0), n >= 2018 && t.rc(0), t.t("");
				};
				Y(i ? 3 : 1, t, e, r, (t) => {
					xi(t, e), a(t);
				}, (t) => {
					t.h(5, F.get(e.style ?? "") ?? F.get("Standard") ?? [...F.values()][0]);
				});
				return;
			}
			case "mtext":
				Y(44, t, e, r, (t) => {
					t.bd3(e.position.x, e.position.y, e.position.z ?? 0), t.bd3(...X(e));
					let r = e.rotation || 0;
					t.bd(Math.cos(r)), t.bd(Math.sin(r)), t.bd(0), t.bd(e.width ?? 0), n >= 2007 && t.bd(0), t.bd(e.height > 0 ? e.height : 5), t.bs(e.attachment ?? 1), t.bs(1), t.bd(0), t.bd(0), t.t(H(ei(e))), n >= 2e3 && (t.bs(1), t.bd(1), t.b(0)), n >= 2004 && t.bl(0), n >= 2018 && (t.b(1), t.bs(4), t.b(1), t.bl(e.attachment ?? 1), t.bd(Math.cos(r)), t.bd(Math.sin(r)), t.bd(0), t.bd3(e.position.x, e.position.y, e.position.z ?? 0), t.bd(e.width ?? 0), t.bd(0), t.bd(0), t.bd(0), t.bl(0));
				}, (t) => {
					t.h(5, F.get(e.style ?? "") ?? F.get("Standard") ?? [...F.values()][0]), n >= 2018 && t.h(5, 0);
				});
				return;
			case "underlay": {
				let n = e.underlayKind + "|" + (e.path ?? "") + "|" + (e.itemName ?? ""), i = ti.get(n);
				i === void 0 && ti.set(n, i = d()), Y(jn.get(e.underlayKind).ent, t, e, r, (t) => {
					t.bd3(...X(e)), t.bd3(e.position.x, e.position.y, e.position.z ?? 0), t.bd(e.rotation || 0), t.bd(e.scale.x || 1), t.bd(e.scale.y || 1), t.bd(e.scale.z || 1), t.rc(e.flags ?? 2), t.rc(e.contrast ?? 100), t.rc(e.fade ?? 0), t.bl(e.clip?.length ?? 0);
					for (let n of e.clip ?? []) t.rd(n.x), t.rd(n.y);
				}, (e) => {
					e.h(5, i);
				});
				return;
			}
			case "insert": {
				let a = B.get(e.blockName);
				if (a === void 0) {
					i.push("insert:" + e.blockName);
					return;
				}
				let o = (e.attributes ?? []).filter((e) => e.type === "text"), s = o.map((e) => Ot.get(e) ?? d()), c = o.length ? d() : 0, l = (e.columnCount ?? 1) > 1 || (e.rowCount ?? 1) > 1;
				if (Y(l ? 8 : 7, t, e, r, (t) => {
					t.bd3(e.position.x, e.position.y, e.position.z ?? 0);
					let r = e.scale ?? {
						x: 1,
						y: 1,
						z: 1
					}, i = r.x || 1, a = r.y || 1, s = r.z || 1;
					n <= 14 ? (t.bd(i), t.bd(a), t.bd(s)) : i === 1 && a === 1 && s === 1 ? t.bb(3) : i === a && a === s ? (t.bb(2), t.rd(i)) : i === 1 ? (t.bb(1), t.dd(a, 1), t.dd(s, 1)) : (t.bb(0), t.rd(i), t.dd(a, i), t.dd(s, i)), t.bd(e.rotation), t.bd3(...X(e)), t.b(+!!o.length), n >= 2004 && o.length && t.bl(o.length), l && (t.bs(e.columnCount ?? 1), t.bs(e.rowCount ?? 1), t.bd(e.columnSpacing ?? 0), t.bd(e.rowSpacing ?? 0));
				}, (e) => {
					if (e.h(5, a), o.length) {
						if (n < 2004) e.h(4, s[0]), e.h(4, s[s.length - 1]);
						else for (let t of s) e.h(4, t);
						e.h(3, c);
					}
				}), o.forEach((e, r) => {
					Y(2, s[r], e, {
						entmode: 0,
						owner: t,
						prev: s[r - 1] ?? 0,
						next: s[r + 1] ?? 0
					}, (t) => {
						xi(t, e), n >= 2018 && (t.rc(0), t.rc(1)), t.t(n <= 14 ? H(ki("ATTR" + (r + 1))) : "ATTR" + (r + 1)), t.bs(0), t.rc(+!!e.invisible | (e.constant ? 2 : 0)), n >= 2007 && t.b(0);
					}, (t) => {
						t.h(5, F.get(e.style ?? "") ?? [...F.values()][0]);
					});
				}), o.length) {
					let n = {
						type: "point",
						layer: e.layer,
						color: { kind: "byLayer" },
						linetype: e.linetype,
						position: {
							x: 0,
							y: 0,
							z: 0
						}
					};
					Y(6, c, n, {
						entmode: 0,
						owner: t
					}, () => {});
				}
				return;
			}
			case "dimension": {
				let i = {
					ordinate: 20,
					linear: 21,
					aligned: 22,
					angular3pt: 23,
					angular2ln: 24,
					radius: 25,
					diameter: 26
				}, a = e.kind && e.kind !== "arc" ? e.kind : "linear";
				Y(i[a], t, e, r, (t) => {
					n >= 2018 && t.rc(0), t.bd3(...X(e));
					let r = e.textMidpoint ?? e.definitionPoint;
					t.rd(r.x), t.rd(r.y), t.bd(e.elevation ?? 0), t.rc((e.dimensionType & 128 ? 0 : 1) | 2), t.t(H(e.text ?? "")), t.bd(e.textRotation ?? 0), t.bd(e.horizDirection ?? 0), t.bd3(1, 1, 1), t.bd(0), n >= 2e3 && (t.bs(e.attachment ?? 5), t.bs(e.lineSpacingStyle ?? 1), t.bd(e.lineSpacingFactor ?? 1), t.bd(e.measurement ?? 0)), n >= 2007 && (t.b(0), t.b(0), t.b(0));
					let i = e.insertionPoint;
					t.rd(i?.x ?? 0), t.rd(i?.y ?? 0);
					let o = (e) => t.bd3(e?.x ?? 0, e?.y ?? 0, e?.z ?? 0);
					switch (a) {
						case "ordinate":
							o(e.definitionPoint), o(e.point13), o(e.point14), t.rc(e.dimensionType & 64 ? 1 : 0);
							break;
						case "linear":
							o(e.point13), o(e.point14), o(e.definitionPoint), t.bd(e.obliqueAngle ?? 0), t.bd(e.rotation ?? 0);
							break;
						case "aligned":
							o(e.point13), o(e.point14), o(e.definitionPoint), t.bd(e.obliqueAngle ?? 0);
							break;
						case "angular3pt":
							o(e.definitionPoint), o(e.point13), o(e.point14), o(e.point15);
							break;
						case "angular2ln":
							t.rd(e.point16?.x ?? 0), t.rd(e.point16?.y ?? 0), o(e.point13), o(e.point14), o(e.point15), o(e.definitionPoint);
							break;
						case "radius":
							o(e.definitionPoint), o(e.point15), t.bd(e.leaderLength ?? 0);
							break;
						case "diameter": o(e.point15), o(e.definitionPoint), t.bd(e.leaderLength ?? 0);
					}
				}, (t) => {
					t.h(5, Re(e.style)), t.h(5, e.blockName && B.get(e.blockName) || 0);
				});
				return;
			}
			case "hatch": {
				let { associative: i, loopBounds: a } = Ft.get(e) ?? {
					associative: !1,
					loopBounds: e.loops.map(() => [])
				};
				Y(78, t, e, r, (t) => {
					let r = Math.PI * 2;
					if (n >= 2004) {
						let n = e.gradient;
						t.bl(+!!n), t.bl(0), t.bd(n?.angle ?? 0), t.bd(n?.shift ?? 0), t.bl(+!!n?.singleColor), t.bd(n?.tint ?? 0);
						let r = n?.colors ?? [];
						t.bl(r.length);
						for (let e of r) t.bd(e.shift), t.bs(e.color.kind === "aci" ? e.color.index : 7), t.bl(e.color.kind === "rgb" ? (3254779904 | e.color.rgb) >>> 0 : 0), t.rc(0);
						t.t(H(n?.name ?? ""));
					}
					t.bd(e.elevation ?? 0), t.bd3(...X(e)), t.t(H(e.patternName || (e.solid ? "SOLID" : "ANSI31"))), t.b(+!!e.solid), t.b(+!!i), t.bl(e.loops.length);
					let o = (t) => +!!t.external | (t.derived && e.pixelSize !== void 0 ? 4 : 0) | (t.outermost ? 16 : 0), s = e.loops.some((t) => t.derived && e.pixelSize !== void 0);
					if (e.loops.forEach((e, s) => {
						if (e.kind === "polyline") {
							t.bl(2 | o(e));
							let n = e.vertices.some((e) => e.bulge);
							t.b(+!!n), t.b(+!!e.closed), t.bl(e.vertices.length);
							for (let r of e.vertices) t.rd(r.x), t.rd(r.y), n && t.bd(r.bulge ?? 0);
						} else {
							t.bl(o(e));
							let i = e.kind === "edges" ? e.edges : e.kind === "circle" ? [{
								kind: "arc",
								center: e.center,
								radius: e.radius,
								startAngle: 0,
								endAngle: r,
								ccw: !0
							}] : [{
								kind: "ellipticalArc",
								center: e.center,
								majorAxis: e.majorAxis,
								ratio: e.ratio,
								startAngle: 0,
								endAngle: r,
								ccw: !0
							}];
							t.bl(i.length);
							for (let e of i) if (e.kind === "line") t.rc(1), t.rd(e.start.x), t.rd(e.start.y), t.rd(e.end.x), t.rd(e.end.y);
							else if (e.kind === "arc") t.rc(2), t.rd(e.center.x), t.rd(e.center.y), t.bd(e.radius), t.bd(e.startAngle), t.bd(e.endAngle), t.b(+!!e.ccw);
							else if (e.kind === "ellipticalArc") t.rc(3), t.rd(e.center.x), t.rd(e.center.y), t.rd(e.majorAxis.x), t.rd(e.majorAxis.y), t.bd(e.ratio), t.bd(e.startAngle), t.bd(e.endAngle), t.b(+!!e.ccw);
							else {
								t.rc(4), t.bl(e.degree > 0 ? e.degree : 3), t.b(+!!e.weights?.length), t.b(+!!e.periodic), t.bl(e.knots.length), t.bl(e.controlPoints.length);
								for (let n of e.knots) t.bd(n);
								if (e.controlPoints.forEach((n, r) => {
									t.rd(n.x), t.rd(n.y), e.weights?.length && t.bd(e.weights[r] ?? 1);
								}), n >= 2010) {
									let n = e.fitPoints ?? [];
									if (t.bl(n.length), n.length) {
										for (let e of n) t.rd(e.x), t.rd(e.y);
										t.rd(0), t.rd(0), t.rd(0), t.rd(0);
									}
								}
							}
						}
						t.bl(i ? a[s]?.length ?? 0 : 0);
					}), t.bs(e.styleFlag ?? 0), t.bs(e.patternType ?? 1), !e.solid) {
						t.bd((e.angle || 0) * Math.PI / 180), t.bd(e.scale > 0 ? e.scale : 1), t.b(+!!e.doubled);
						let n = e.definitionLines ?? [];
						t.bs(n.length);
						for (let e of n) {
							t.bd(e.angle * Math.PI / 180), t.bd(e.base.x), t.bd(e.base.y), t.bd(e.offset.x), t.bd(e.offset.y), t.bs(e.dashes.length);
							for (let n of e.dashes) t.bd(n);
						}
					}
					s && t.bd(e.pixelSize);
					let c = e.seeds ?? [];
					t.bl(c.length);
					for (let e of c) t.rd(e.x), t.rd(e.y);
				}, (e) => {
					if (i) for (let t of a) for (let n of t) e.h(4, n);
				});
				return;
			}
			case "mline":
				Y(47, t, e, r, (t) => {
					t.bd(e.scale || 1), t.rc(e.justification & 255), t.bd3(e.basePoint.x, e.basePoint.y, e.basePoint.z ?? 0), t.bd3(...X(e)), t.bs(1 | (e.closed ? 2 : 0));
					let n = e.vertices[0]?.lines.length ?? 0;
					t.rc(n), t.bs(e.vertices.length);
					for (let r of e.vertices) {
						t.bd3(r.position.x, r.position.y, r.position.z ?? 0), t.bd3(r.direction.x, r.direction.y, r.direction.z ?? 0), t.bd3(r.miterDirection.x, r.miterDirection.y, r.miterDirection.z ?? 0);
						for (let e = 0; e < n; e++) {
							let n = r.lines[e] ?? { segparms: [] };
							t.bs(n.segparms.length);
							for (let e of n.segparms) t.bd(e);
							t.bs(n.areaFillParms?.length ?? 0);
							for (let e of n.areaFillParms ?? []) t.bd(e);
						}
					}
				}, (t) => {
					t.h(5, Ue(e.styleName));
				});
				return;
			case "tolerance":
				Y(46, t, e, r, (t) => {
					n <= 14 && (t.bs(0), t.bd(0), t.bd(0)), t.bd3(e.position.x, e.position.y, e.position.z ?? 0), t.bd3(e.xDirection.x, e.xDirection.y, e.xDirection.z ?? 0), t.bd3(...X(e)), t.t(H(e.text));
				}, (e) => {
					e.h(5, Ae);
				});
				return;
			case "shape":
				Y(33, t, e, r, (t) => {
					t.bd3(e.position.x, e.position.y, e.position.z ?? 0), t.bd(e.size > 0 ? e.size : 1), t.bd(e.rotation), t.bd(e.widthFactor ?? 1), t.bd(e.oblique ?? 0), t.bd(0), t.bs(e.styleId ?? 0), t.bd3(...X(e));
				}, (t) => {
					t.h(5, F.get(e.style ?? "") ?? [...F.values()][0]);
				});
				return;
			case "leader":
				Y(45, t, e, r, (t) => {
					t.b(0), t.bs(h(e) ? e.annotationType ?? 0 : 3), t.bs(e.pathType ?? 0), t.bl(e.vertices.length);
					for (let n of e.vertices) t.bd3(n.x, n.y, n.z ?? 0);
					let r = e.vertices[e.vertices.length - 1] ?? {
						x: 0,
						y: 0,
						z: 0
					};
					t.bd3(r.x, r.y, r.z ?? 0), t.bd3(...X(e)), t.bd3(1, 0, 0), t.bd3(0, 0, 0), n > 13 && t.bd3(0, 0, 0), n <= 14 && t.bd(0), n <= 2007 && (t.bd(0), t.bd(0)), t.b(0), t.b(e.hasArrowhead === !1 ? 0 : 1), t.bs(0), n <= 14 ? (t.bd(0), t.b(0), t.b(0), t.bs(0), t.bs(0), t.b(0), t.b(0)) : (t.b(0), t.b(0));
				}, (t) => {
					t.h(2, h(e)), t.h(5, Ae);
				});
				return;
			case "viewport":
				if (n <= 14) {
					let n = e.viewTarget ?? {
						x: 0,
						y: 0,
						z: 0
					}, i = e.viewDirection ?? {
						x: 0,
						y: 0,
						z: 1
					}, a = e.viewCenter ?? {
						x: e.center.x,
						y: e.center.y
					}, o = (e) => ({
						code: 1010,
						point: {
							x: e.x,
							y: e.y,
							z: e.z ?? 0
						}
					}), s = (e) => ({
						code: 1040,
						value: e
					}), c = (e) => ({
						code: 1070,
						value: e
					}), l = (e) => ({
						code: 1002,
						value: e
					}), u = [
						{
							code: 1e3,
							value: "MVIEW"
						},
						l("{"),
						c(16),
						o(n),
						o(i),
						s(e.twistAngle ?? 0),
						s(e.viewHeight ?? e.height),
						s(a.x),
						s(a.y),
						s(e.lensLength ?? 50),
						s(0),
						s(0),
						c(0),
						c(1e3),
						c(1),
						c(3),
						c(0),
						c(0),
						c(0),
						c(0),
						s(0),
						s(0),
						s(0),
						s(.5),
						s(.5),
						s(.5),
						s(.5),
						c(0),
						l("{"),
						l("}"),
						l("}")
					], d = (e) => e.values.some((e) => e.code === 1e3 && "value" in e && e.value === "MVIEW"), f = {
						...e,
						xdata: [...(e.xdata ?? []).filter((e) => !d(e)), {
							appName: "ACAD",
							values: u
						}]
					};
					Y(34, t, f, r, (t) => {
						t.bd3(e.center.x, e.center.y, e.center.z ?? 0), t.bd(e.width), t.bd(e.height);
					}, (e) => {
						e.h(5, 0);
					});
					return;
				}
				Y(34, t, e, r, (t) => {
					t.bd3(e.center.x, e.center.y, e.center.z ?? 0), t.bd(e.width), t.bd(e.height);
					let r = e.viewTarget ?? {
						x: 0,
						y: 0,
						z: 0
					};
					t.bd3(r.x, r.y, r.z ?? 0);
					let i = e.viewDirection ?? {
						x: 0,
						y: 0,
						z: 1
					};
					t.bd3(i.x, i.y, i.z ?? 0), t.bd(e.twistAngle ?? 0), t.bd(e.viewHeight ?? e.height), t.bd(e.lensLength ?? 50), t.bd(0), t.bd(0), t.bd(0);
					let a = e.viewCenter ?? {
						x: e.center.x,
						y: e.center.y
					};
					t.rd(a.x), t.rd(a.y), t.rd(0), t.rd(0), t.rd(10), t.rd(10), t.rd(10), t.rd(10), t.bs(100), n >= 2007 && t.bs(0), t.bl(0), t.bl(e.statusFlag ?? 0), t.t(""), t.rc(0), t.b(1), t.b(1), t.bd3(0, 0, 0), t.bd3(1, 0, 0), t.bd3(0, 1, 0), t.bd(0), t.bs(0), n >= 2004 && t.bs(0), n >= 2007 && (t.b(1), t.rc(1), t.bd(.5), t.bd(.5), t.bs(256), t.bl(0), t.rc(0));
				}, (e) => {
					e.h(5, 0), n <= 2004 && e.h(5, 0), e.h(5, 0), e.h(5, 0), n >= 2007 && (e.h(4, 0), e.h(5, 0), e.h(4, 0), e.h(3, 0));
				});
				return;
			case "light":
				Y(un, t, e, r, (t) => {
					t.bl(0), t.t(e.name ?? ""), t.bl(e.lightType ?? 1), t.b(e.on === !1 ? 0 : 1);
					let r = e.lightColor?.kind === "aci" ? e.lightColor.index : 7;
					t.bs(r), n >= 2004 && (t.bl(0), t.rc(0)), t.b(0), t.bd(e.intensity ?? 1), t.bd3(e.position.x, e.position.y, e.position.z ?? 0);
					let i = e.target ?? {
						x: 0,
						y: 0,
						z: 0
					};
					t.bd3(i.x, i.y, i.z ?? 0), t.bl(0), t.b(0), t.bd(0), t.bd(1), t.bd(e.hotspotAngle ?? 0), t.bd(e.falloffAngle ?? 0), t.b(+!!e.castShadows);
				});
				return;
			case "mleader": {
				let i = (e, t = 193) => {
					n >= 2004 ? (e.bs(0), e.bl(t << 24 >>> 0), e.rc(0)) : e.bs(t === 192 ? 256 : 0);
				}, a = e.blockName === void 0 ? void 0 : B.get(e.blockName), s = e.text !== void 0 && !!e.textPosition, c = !s && a !== void 0 && !!e.blockPosition, l = c ? (o.blocks[e.blockName]?.entities ?? []).filter((e) => e.type === "text" && e.attribute === "attdef") : [], u = c ? (e.attributes ?? []).filter((e) => typeof e.text == "string") : [], d = (e) => {
					if (e.attdef) {
						let t = At.get(e.attdef.toUpperCase());
						if (t !== void 0 && l.some((e) => dt.get(e) === t)) return t;
					}
					let t = l[(e.index || 1) - 1];
					return t ? dt.get(t) ?? 0 : 0;
				}, f = "ACAD_MLEADERVER", p = e.xdata?.some((e) => e.appName === f) ? e : {
					...e,
					xdata: [...e.xdata ?? [], {
						appName: f,
						values: [{
							code: 1070,
							value: 2
						}]
					}]
				};
				Y(hn, t, p, r, (t) => {
					n >= 2018 && t.bs(2), t.bl(e.leaders.length);
					for (let r of e.leaders) t.b(+!!r.landing), t.b(+!!r.doglegVector), r.landing && t.bd3(r.landing.x, r.landing.y, r.landing.z ?? 0), r.doglegVector && t.bd3(r.doglegVector.x, r.doglegVector.y, r.doglegVector.z ?? 0), t.bl(0), t.bl(0), t.bd(r.doglegLength ?? 0), t.bl(r.lines.length), r.lines.forEach((e, r) => {
						t.bl(e.length);
						for (let n of e) t.bd3(n.x, n.y, n.z ?? 0);
						t.bl(0), t.bl(r), n >= 2018 && (t.bs(1), i(t), t.bl(-2), t.bd(0), t.bl(0));
					}), n >= 2018 && t.bs(0);
					t.bd(e.scale ?? 1);
					{
						let n = e.leaders[0], r = n?.landing && n.doglegVector ? {
							x: n.landing.x + n.doglegVector.x * (n.doglegLength ?? 0),
							y: n.landing.y + n.doglegVector.y * (n.doglegLength ?? 0),
							z: (n.landing.z ?? 0) + (n.doglegVector.z ?? 0) * (n.doglegLength ?? 0)
						} : e.textPosition ?? e.blockPosition ?? {
							x: 0,
							y: 0,
							z: 0
						};
						t.bd3(r.x, r.y, r.z ?? 0);
					}
					if (t.bd(e.textHeight ?? 0), t.bd(e.arrowSize ?? 0), t.bd(0), t.bs(1), t.bs(1), t.bs(0), t.bs(0), t.b(+!!s), s) {
						t.t(H(e.text)), t.bd3(...X(e));
						let n = e.textPosition;
						t.bd3(n.x, n.y, n.z ?? 0), t.bd3(1, 0, 0), t.bd(e.textRotation ?? 0), t.bd(0), t.bd(0), t.bd(1), t.bs(1), i(t, 192), t.bs(1), t.bs(5), i(t, 192), t.bd(0), t.bl(0), t.b(0), t.b(0), t.bs(0), t.b(0), t.bd(0), t.bd(0), t.b(0), t.bl(0), t.b(0), t.b(0);
					} else if (t.b(+!!c), c) {
						t.bd3(...X(e));
						let n = e.blockPosition;
						t.bd3(n.x, n.y, n.z ?? 0);
						let r = e.blockScale ?? {
							x: 1,
							y: 1,
							z: 1
						};
						t.bd3(r.x, r.y, r.z ?? 1), t.bd(e.blockRotation ?? 0), i(t);
						for (let e = 0; e < 4; e++) for (let n = 0; n < 4; n++) t.bd(+(e === n));
					}
					t.bd3(0, 0, 0), t.bd3(1, 0, 0), t.bd3(0, 1, 0), t.b(0), n >= 2018 && (t.bs(9), t.bs(9)), t.bl(0), t.bs(1), i(t), t.bl(-2), t.b(+!!e.hasLanding), t.b(+!!e.hasDogleg), t.bd(e.leaders[0]?.doglegLength ?? 0), t.bd(e.arrowSize ?? 0), t.bs(c ? 1 : 2), t.bs(1), t.bs(1), t.bs(1), t.bs(0), i(t), t.b(0), i(t), t.bd3(1, 1, 1), t.bd(0), t.bs(0), t.b(0), n < 2018 && t.bl(0), t.bl(u.length);
					for (let e of u) t.t(H(e.text)), t.bs(e.index || 1), t.bd(e.width ?? 0);
					t.b(0), t.bs(0), t.bs(1), t.b(0), t.b(1), n >= 2018 && (t.bs(0), t.bs(9), t.bs(9), t.b(0));
				}, (t) => {
					if (n >= 2018) for (let n of e.leaders) for (let e of n.lines) t.h(5, 0), t.h(5, 0);
					s ? t.h(5, F.get(e.textStyle ?? "") ?? F.get("Standard") ?? [...F.values()][0]) : c && t.h(5, a), t.h(5, Tn(e.styleName)), t.h(5, 0), t.h(5, 0), t.h(5, F.get(e.textStyle ?? "") ?? F.get("Standard") ?? [...F.values()][0]), t.h(5, c ? a : 0);
					for (let e of u) t.h(4, d(e));
				});
				return;
			}
			case "table": {
				let i = e.numRows, a = e.numColumns, o = new Uint8Array(i * a);
				for (let t = 0; t < i; t++) for (let n = 0; n < a; n++) {
					let r = e.cells[t * a + n];
					if (!r || o[t * a + n]) continue;
					let s = Math.max(1, r.spanColumns ?? 1), c = Math.max(1, r.spanRows ?? 1);
					for (let e = t; e < Math.min(i, t + c); e++) for (let r = n; r < Math.min(a, n + s); r++) (e !== t || r !== n) && (o[e * a + r] = 1);
				}
				let s = [
					"top",
					"right",
					"bottom",
					"left"
				], c = (e) => e.contentType === 2 && e.blockName ? B.get(e.blockName) : void 0, l = (e) => e.textStyle ? F.get(e.textStyle) : void 0, u = (e, t) => (e.rotation ? 4 : 0) | (t & 8 ? 32 : 0) | (t & 16 ? 64 : 0) | (t & 32 ? 128 : 0), d = (e) => s.reduce((t, n, r) => e.borders?.[n] ? t | 1 << r : t, 0), f = (e) => {
					let t = 0;
					return e.alignment !== void 0 && (t |= 1), e.fillEnabled !== void 0 && (t |= 2), e.fillColor && (t |= 4), e.textColor && (t |= 8), l(e) !== void 0 && (t |= 16), e.textHeight !== void 0 && e.textHeight > 0 && (t |= 32), s.forEach((n, r) => {
						let i = e.borders?.[n];
						i && (i.color && (t |= 64 << r), i.lineweight !== void 0 && (t |= 1024 << r), i.visible !== void 0 && (t |= 16384 << r));
					}), t;
				}, p = (e, t) => {
					e.bs(0);
					let n = t ? t.kind === "byLayer" ? 3221225472 : t.kind === "byBlock" ? 3238002688 : t.kind === "aci" ? 3271557120 | t.index & 255 : 3254779904 | t.rgb & 16777215 : 3355443200;
					e.bl(n >>> 0), e.rc(0);
				}, m = (t) => {
					let n = 1;
					return e.titleSuppressed && (n = 2), t === 0 ? e.headerSuppressed && n === 2 ? 3 : n : t === 1 && !e.titleSuppressed ? e.headerSuppressed ? 3 : 2 : 3;
				};
				if (n >= 2018) {
					Y(pn, t, e, r, (t) => {
						let n = (e) => {
							t.bl(0), t.bl(4);
							let n = H(e);
							t.bl((n.length + 1) * 2);
							for (let e = 0; e < n.length; e++) {
								let r = n.charCodeAt(e);
								t.rc(r & 255), t.rc(r >> 8 & 255);
							}
							t.rc(0), t.rc(0), t.bl(0), t.t(""), t.t("");
						}, r = (e) => {
							t.bl(e), t.bs(0);
						}, i = (e, n, r) => {
							t.bl(n), t.bl(0), t.bl(r ? 4 : 512), t.bl(0), t.t(""), t.bd(r ? e.rotation ?? 0 : 0), t.bd(1), t.bl(r ? 1 : e.alignment ?? 1), p(t, r ? e.textColor ?? { kind: "byBlock" } : { kind: "byBlock" }), t.bd(r && e.textHeight ? e.textHeight : .18);
						}, a = (e, n) => {
							if (t.bl(1), !n) {
								t.bs(0);
								return;
							}
							t.bs(1), t.bl((n & 1 ? 16 : 0) | (n & 4 ? 512 : 0)), t.bl(0), p(t, e.fillColor), t.bl(1), i(e, 0, !1), t.bs(0);
							let r = s.filter((t) => e.borders?.[t]);
							t.bl(r.length);
							for (let n of r) {
								let r = e.borders[n];
								t.bl(1 << s.indexOf(n)), t.bl((r.lineweight === void 0 ? 0 : 2) | (r.color ? 8 : 0) | (r.visible === void 0 ? 0 : 16)), t.bl(1), p(t, r.color ?? { kind: "byBlock" }), t.bl(r.lineweight ?? -2), t.bl(+(r.visible === !1)), t.bd(.045);
							}
						};
						t.bd3(e.position.x, e.position.y, e.position.z ?? 0), t.bb(3), t.bd(0), t.bd3(...X(e)), t.b(0), t.rc(0), t.bl(0), t.bl(0), t.t(""), t.t(""), t.bl(e.numColumns);
						for (let n = 0; n < e.numColumns; n++) t.t(""), t.bl(0), t.bl(0), r(3), t.bl(0), t.bd(e.columnWidths[n] ?? 1);
						t.bl(e.numRows);
						for (let o = 0; o < e.numRows; o++) {
							t.bl(e.numColumns);
							for (let r = 0; r < e.numColumns; r++) {
								let s = e.cells[o * e.numColumns + r] ?? {}, l = f(s), d = c(s);
								if (t.bl(0), t.t(""), t.bl(0), t.bl(0), t.bl(0), d !== void 0) {
									t.bl(1), t.bl(4);
									let e = s.attributes ?? [];
									t.bl(e.length);
									for (let n of e) t.t(H(n.text)), t.bl(n.index ?? 1);
									let n = u(s, l);
									t.bs(n || e.length ? 1 : 0), (n || e.length) && i(s, n, !0);
								} else if (s.text) {
									t.bl(1), t.bl(1), n(s.text), t.bl(0);
									let e = u(s, l);
									t.bs(+!!e), e && i(s, e, !0);
								} else t.bl(0);
								a(s, l), t.bl(0), t.bl(1), t.bl(7), t.bd(.12), t.bd(.12), t.bl(0);
							}
							t.bl(0), t.bl(0), r(2), t.bl(m(o)), t.bd(e.rowHeights[o] ?? 1);
						}
						t.bl(0), r(4);
						let o = [];
						e.cells.forEach((t, n) => {
							if (!t) return;
							let r = t.spanColumns ?? 1, i = t.spanRows ?? 1;
							if (r <= 1 && i <= 1) return;
							let a = Math.floor(n / e.numColumns), s = n % e.numColumns;
							o.push([
								a,
								s,
								a + i - 1,
								s + r - 1
							]);
						}), t.bl(o.length);
						for (let e of o) t.bl(e[0]), t.bl(e[1]), t.bl(e[2]), t.bl(e[3]);
						t.bl(6);
						let l = e.direction ?? {
							x: 1,
							y: 0,
							z: 0
						};
						t.bd3(l.x, l.y, l.z ?? 0), t.bl(0), t.bl(1), t.bl(0), t.bl(0), t.bl(0), t.bl(0), t.bl(Math.max(0, e.numRows - 1));
					}, (t) => {
						t.h(5, e.blockName && B.get(e.blockName) || 0);
						for (let n = 0; n < e.numRows * e.numColumns; n++) {
							let r = e.cells[n] ?? {}, i = f(r), a = c(r);
							if ((a !== void 0 || r.text) && ((u(r, i) || a !== void 0 && r.attributes?.length) && t.h(4, 0), a !== void 0)) {
								t.h(5, a);
								for (let e of r.attributes ?? []) t.h(4, e.attdef ? At.get(e.attdef.toUpperCase()) ?? 0 : 0);
							}
							if (i) {
								t.h(5, i & 16 ? l(r) : 0);
								for (let e of s) r.borders?.[e] && t.h(5, 0);
							}
							t.h(4, 0);
						}
						t.h(4, 0), t.h(5, wn(e.styleName));
					});
					return;
				}
				Y(pn, t, e, r, (t) => {
					t.bd3(e.position.x, e.position.y, e.position.z ?? 0), n >= 2e3 ? t.bb(3) : (t.bd(1), t.bd(1), t.bd(1)), t.bd(0), t.bd3(...X(e)), t.b(0), t.bs(22);
					let r = e.direction ?? {
						x: 1,
						y: 0,
						z: 0
					};
					t.bd3(r.x, r.y, r.z ?? 0), t.bl(e.numColumns), t.bl(e.numRows);
					for (let n = 0; n < e.numColumns; n++) t.bd(e.columnWidths[n] ?? 1);
					for (let n = 0; n < e.numRows; n++) t.bd(e.rowHeights[n] ?? 1);
					let i = (e, t, n) => {
						e.bl(n), e.rc(0), n & 1 && e.bs(t.alignment), n & 2 && e.b(+!t.fillEnabled), n & 4 && p(e, t.fillColor), n & 8 && p(e, t.textColor), n & 32 && e.bd(t.textHeight);
						for (let n of s) {
							let r = t.borders?.[n];
							r && (r.color && p(e, r.color), r.lineweight !== void 0 && e.bs(r.lineweight), r.visible !== void 0 && e.bs(+!r.visible));
						}
					};
					for (let r = 0; r < e.numRows * e.numColumns; r++) {
						let a = e.cells[r] ?? {}, s = f(a), l = c(a);
						if (t.bs(l === void 0 ? 1 : 2), t.rc(d(a)), t.b(o[r] || a.merged ? 1 : 0), t.b(+!!a.autofit), t.bl(a.spanColumns ?? 1), t.bl(a.spanRows ?? 1), t.bd(a.rotation ?? 0), l !== void 0) {
							t.bd(1);
							let e = a.attributes ?? [];
							if (t.b(+!!e.length), e.length) {
								t.bs(e.length);
								for (let n of e) t.bs(n.index ?? 1), t.t(H(n.text));
							}
							n === 2007 ? (t.b(+!!s), s && i(t, a, s), t.bl(0), t.bl(1), t.bl(4), t.bl(0), t.t(""), t.t("")) : (t.b(+!!s), s && i(t, a, s));
							continue;
						}
						if (n === 2007) {
							t.b(+!!s), s && i(t, a, s), t.bl(0), t.bl(4), t.bl(4);
							let e = a.text ?? "";
							t.bl((e.length + 1) * 2);
							for (let n = 0; n < e.length; n++) {
								let r = e.charCodeAt(n);
								t.rc(r & 255), t.rc(r >> 8 & 255);
							}
							t.rc(0), t.rc(0), t.bl(0), t.t(""), t.t(e);
						} else t.t(H(a.text ?? "")), t.b(+!!s), s && i(t, a, s);
					}
					let a = +!!e.titleSuppressed | (e.headerSuppressed ? 2 : 0) | (e.flowDirection === void 0 ? 0 : 4) | (e.horizontalMargin === void 0 ? 0 : 8) | (e.verticalMargin === void 0 ? 0 : 16);
					t.b(+!!a), a && (t.bl(a), a & 1 && t.b(1), a & 4 && t.bs(e.flowDirection), a & 8 && t.bd(e.horizontalMargin), a & 16 && t.bd(e.verticalMargin)), t.b(0), t.b(0), t.b(0);
				}, (t) => {
					t.h(5, e.blockName && B.get(e.blockName) || 0), t.h(5, wn(e.styleName));
					for (let n = 0; n < e.numRows * e.numColumns; n++) {
						let r = e.cells[n] ?? {}, i = c(r);
						if (i !== void 0) {
							t.h(5, i);
							for (let e of r.attributes ?? []) t.h(4, e.attdef ? At.get(e.attdef.toUpperCase()) ?? 0 : 0);
						} else t.h(5, 0);
						let a = l(r);
						a !== void 0 && t.h(5, a);
					}
				});
				return;
			}
			case "acis": {
				let i = e.kind === "region" ? 37 : e.kind === "solid3d" ? 38 : 39;
				if (n >= 2018 && e.sab && !e.surfaceKind) {
					let n = V(e.sab);
					if (n.length) {
						at.push({
							handle: t,
							sab: n
						}), Y(i, t, e, {
							...r,
							hasDs: !0
						}, (e) => {
							e.b(1), e.b(1), e.bd3(0, 0, 0), e.bl(4), e.b(1), e.bl(0), e.bl(0), e.b(1), e.bl(0), e.b(1);
							let r = Nt(t, n);
							e.bl(r[0] | r[1] << 8 | r[2] << 16 | r[3] << 24), e.bs(r[4] | r[5] << 8), e.bs(r[6] | r[7] << 8);
							for (let t = 8; t < 16; t++) e.rc(r[t]);
							e.bl(0);
						}, (e) => {
							e.h(3, 0);
						});
						return;
					}
				}
				let a = !!e.sab && (Mt(e.sab) ? n >= 2013 : n >= 2007), o = e.sat ?? (e.sab && !a ? gt(e.sab) ?? void 0 : void 0), s = (e, t) => {
					n < 2007 || (t && e.b(1), e.b(1), e.bd3(0, 0, 0), e.bl(4), e.b(1), e.bl(0), e.bl(0), e.b(1), e.bl(0));
				};
				Y(i, t, e, r, (t) => {
					if (!o) {
						if (!e.sab) {
							t.b(1), s(t, !1);
							return;
						}
						t.b(0), t.b(0), t.bs(2);
						for (let n of V(e.sab)) t.rc(n);
						s(t, !0);
						return;
					}
					t.b(0), t.b(0), t.bs(1);
					let n = [];
					for (let e = 0; e < o.length; e++) {
						let t = o.charCodeAt(e) & 255;
						n.push(t <= 32 ? t : 159 - t & 255);
					}
					t.bl(n.length);
					for (let e of n) t.rc(e);
					t.bl(0), s(t, !1);
				});
				return;
			}
			case "mesh": {
				let i = e.meshKind === "grid", a = e.vertices.map(() => d()), o = (i ? [] : e.faces ?? []).map(() => d()), s = [...a, ...o], c = d();
				Y(i ? 30 : 29, t, e, r, (t) => {
					i ? (t.bs(!!e.closedM | 16 | (e.closedN ? 32 : 0)), t.bs(0), t.bs(e.mSize ?? e.vertices.length), t.bs(e.nSize ?? 1), t.bs(0), t.bs(0)) : (t.bs(e.vertices.length), t.bs(e.faces?.length ?? 0)), n >= 2004 && t.bl(s.length);
				}, (e) => {
					if (n < 2004) e.h(4, s[0] ?? 0), e.h(4, s[s.length - 1] ?? 0);
					else for (let t of s) e.h(4, t);
					e.h(3, c);
				});
				let l = i ? 12 : 13;
				e.vertices.forEach((n, r) => {
					let o = {
						type: "point",
						layer: e.layer,
						color: { kind: "byLayer" },
						linetype: e.linetype,
						position: n
					};
					Y(l, a[r], o, {
						entmode: 0,
						owner: t,
						prev: s[r - 1] ?? 0,
						next: s[r + 1] ?? 0
					}, (e) => {
						e.rc(i ? 64 : 192), e.bd3(n.x, n.y, n.z ?? 0);
					});
				}), i || (e.faces ?? []).forEach((n, r) => {
					let i = a.length + r, c = {
						type: "point",
						layer: e.layer,
						color: { kind: "byLayer" },
						linetype: e.linetype,
						position: {
							x: 0,
							y: 0,
							z: 0
						}
					};
					Y(14, o[r], c, {
						entmode: 0,
						owner: t,
						prev: s[i - 1] ?? 0,
						next: s[i + 1] ?? 0
					}, (e) => {
						for (let t = 0; t < 4; t++) e.bs(n[t] ?? 0);
					});
				});
				{
					let n = {
						type: "point",
						layer: e.layer,
						color: { kind: "byLayer" },
						linetype: e.linetype,
						position: {
							x: 0,
							y: 0,
							z: 0
						}
					};
					Y(6, c, n, {
						entmode: 0,
						owner: t
					}, () => {});
				}
				return;
			}
			case "image": {
				let i = 0;
				if (!e.wipeout) {
					let t = (e.path ?? "") + "|" + e.widthPx + "x" + e.heightPx, n = rn.get(t);
					i = n ?? d(), n === void 0 && rn.set(t, i);
				}
				Y(e.wipeout ? ln : sn, t, e, r, (t) => {
					t.bl(0), t.bd3(e.position.x, e.position.y, e.position.z ?? 0), t.bd3(e.uVector.x, e.uVector.y, e.uVector.z ?? 0), t.bd3(e.vVector.x, e.vVector.y, e.vVector.z ?? 0), t.rd(e.widthPx), t.rd(e.heightPx), t.bs(3), t.b(+!!e.clip?.length), t.rc(e.brightness ?? 50), t.rc(e.contrast ?? 50), t.rc(e.fade ?? 0), n >= 2018 && t.b(+!!e.clipInverted);
					let r = e.clip?.length ? e.clip : [{
						x: -.5,
						y: -.5
					}, {
						x: e.widthPx - .5,
						y: e.heightPx - .5
					}];
					t.bs(r.length === 2 ? 1 : 2), r.length !== 2 && t.bl(r.length);
					for (let e of r) t.rd(e.x), t.rd(e.y);
				}, (e) => {
					e.h(5, i), e.h(3, 0);
				});
				return;
			}
			case "spline":
				Y(36, t, e, r, (t) => {
					if (e.controlPoints.length >= 2) {
						t.bl(1), n >= 2018 && (t.bl(0), t.bl(15)), t.bl(e.degree > 0 ? e.degree : 3), t.b(+!!e.weights?.length), t.b(+!!e.closed), t.b(0), t.bd(1e-7), t.bd(1e-7), t.bl(e.knots.length), t.bl(e.controlPoints.length), t.b(+!!e.weights?.length);
						for (let n of e.knots) t.bd(n);
						e.controlPoints.forEach((n, r) => {
							t.bd3(n.x, n.y, n.z ?? 0), e.weights?.length && t.bd(e.weights[r] ?? 1);
						});
					} else {
						t.bl(n >= 2018 ? 1 : 2), n >= 2018 && (t.bl(9), t.bl(0)), t.bl(e.degree > 0 ? e.degree : 3), t.bd(1e-7), t.bd3(0, 0, 0), t.bd3(0, 0, 0), t.bl(e.fitPoints?.length ?? 0);
						for (let n of e.fitPoints ?? []) t.bd3(n.x, n.y, n.z ?? 0);
					}
				});
				return;
			case "proxy": {
				let i = e.appClass?.dxfName ?? e.sourceType ?? "ACAD_PROXY_ENTITY", a = U.get(i), o = e.appClass?.cppName ?? "AcDbEntity";
				Y(498, t, e, r, (t) => {
					let r = e.proxyVersion ?? 0;
					oi(t, a?.num ?? 498, o, r & 65535, e.proxyMaint ?? r >>> 16, !!e.fromDxf), n >= 2007 && (e.strData && e.strBits ? t.strTarget?.putBits(V(e.strData), e.strBits) : si(t, o)), e.data && e.dataBits && ci(t, e.data, e.dataBits, !!e.fromDxf, a?.num);
				}, (t) => {
					for (let n of e.refs ?? []) t.h(n.code, g(n.value));
				}, e.graphicsData ? V(e.graphicsData) : void 0);
				return;
			}
			case "unknown": {
				if (!e.data && !e.graphicsData && !rt(e)) {
					i.push(e.sourceType);
					return;
				}
				let a = e.graphicsData ? V(e.graphicsData) : void 0, o = (t) => {
					for (let n of e.refs ?? []) t.h(n.code, g(n.value));
				}, s = e.appClass?.dxfName ?? e.sourceType, c = e.appClass?.cppName ?? "AcDbEntity";
				if (rt(e)) {
					let n = U.get(s)?.num ?? 498, i = () => {};
					Y(498, t, e, r, (t) => {
						oi(t, n, c, er, 2147483646, !0), si(t, c), i = ui(t, e, 498, n);
					}, (e) => i(e), a);
					return;
				}
				if (e.encoding === Ce(n) || e.data === void 0) {
					let n = e.typeCode ?? U.get(s)?.num ?? 498;
					Y(n, t, e, r, (t) => {
						e.data && e.dataBits && t.putBits(V(e.data), e.dataBits), e.strData && e.strBits && t.strTarget?.putBits(V(e.strData), e.strBits);
					}, o, a);
				} else Gn(e) && e.typeCode === void 0 ? Y(498, t, e, r, (t) => {
					oi(t, U.get(s)?.num ?? 498, c, Qn(e.encoding), 0, !1), si(t, c), li(t, e);
				}, o, a) : Y(498, t, e, r, (t) => {
					t.bl(e.typeCode === void 0 ? U.get(s)?.num ?? 0 : 0), t.bl((we | (e.encoding ?? 0)) >>> 0), n >= 2018 && t.bl(0), n >= 2e3 && t.b(0), ai(t, e, e.appClass?.cppName ?? "AcDbEntity");
				}, o, a);
				return;
			}
			case "ole": {
				let i;
				if (e.data && e.data.length >= 98) i = e.data;
				else {
					i = new Uint8Array(98 + (e.data?.length ?? 0));
					let t = new DataView(i.buffer);
					t.setUint16(0, 2, !0), e.corners.forEach((e, n) => {
						t.setFloat64(2 + n * 24, e.x, !0), t.setFloat64(10 + n * 24, e.y, !0), t.setFloat64(18 + n * 24, e.z ?? 0, !0);
					}), e.data && i.set(e.data, 98);
				}
				Y(74, t, e, r, (t) => {
					t.bs(e.oleType ?? 2), n >= 2e3 && t.bs(e.tileMode ?? 1), t.bl(i.length), t.raw(i), n >= 2e3 && t.rc(+!!e.lockAspect);
				});
				return;
			}
			default: i.push(e.type);
		}
	}, Di = /* @__PURE__ */ new Set([
		"*active",
		"*model_space",
		"*paper_space",
		"standard",
		"continuous",
		"bylayer",
		"byblock",
		"acad"
	]), Oi = (e) => {
		if (n > 14) return e;
		let t = Di.has(e.toLowerCase()) ? e.toUpperCase() : e;
		return n === 14 ? t + "\0" : t;
	}, ki = (e) => n === 14 && e ? e + "\0" : e, Ai = (e) => n >= 2007 ? e : H(e), ji = (e) => n >= 2e3 && n < 2007 && e ? Ai(e) + "\0" : Ai(ki(e)), Mi = (e, t, r = 0, i = !1) => {
		e.t(Ai(Oi(t))), n <= 2004 ? (e.b(1), e.bs(r || i ? 1 : 0), e.b(+!!r)) : e.bs(r ? 256 : 0);
	}, Ni = (e) => {
		let t = he.get(e.name), r = q.get(t)?.h ?? 0;
		J(51, t, (t) => {
			if (Mi(t, e.name, $e(e.name)), n <= 14) t.b(+!!e.frozen), t.b(+(e.on === !1)), t.b(0), t.b(+!!e.locked);
			else {
				let n = 0;
				e.frozen && (n |= 1), e.locked && (n |= 8), e.plottable !== !1 && (n |= 16), n |= (It(e.lineweight) & 31) << 5, e.on === !1 && (n |= 2), t.bs(n);
			}
			let r = e.color.kind === "aci" ? e.color.index & 255 : e.color.kind === "byBlock" ? 0 : 7;
			t.bs(r), n >= 2004 && (t.bl(e.color.kind === "rgb" ? (3254779904 | e.color.rgb & 16777215) >>> 0 : (3271557120 | r) >>> 0), t.rc(0));
		}, (t) => {
			t.h(4, S), (n < 2004 || r) && t.h(3, r), t.h(5, $e(e.name)), n >= 2e3 && t.h(5, 0), n >= 2007 && t.h(5, 0);
			let i = e.linetype && Ee.get(e.linetype);
			t.h(5, i || De), n >= 2018 && t.h(5, 0);
		}, r);
	}, Pi = (e) => {
		let t = F.get(e.name), r = q.get(t)?.h ?? 0;
		J(53, t, (t) => {
			Mi(t, e.name, $e(e.name)), t.b(+!!e.shapeFile), t.b(0), t.bd(e.fixedHeight ?? 0), t.bd(e.widthFactor ?? 1), t.bd(e.oblique ?? 0), t.rc(0), t.bd(2.5), t.t(H(ki(e.font ?? "txt"))), t.t(H(ki(e.bigFont ?? "")));
		}, (t) => {
			t.h(4, C), (n < 2004 || r) && t.h(3, r), t.h(5, $e(e.name));
		}, r);
	}, Fi = (e, t, r) => {
		let i = (r?.pattern ?? []).length >= 2 ? r.pattern : [], a = q.get(t)?.h ?? 0;
		J(57, t, (t) => {
			Mi(t, e, $e(e)), t.t(H(ki(r?.description ?? ""))), t.bd(i.reduce((e, t) => e + Math.abs(t), 0)), t.rc(65), t.rc(i.length);
			for (let e of i) t.bd(e), t.bs(0), t.rd(0), t.rd(0), t.bd(0), t.bd(0), t.bs(0);
			if (n <= 2004) for (let e = 0; e < 256; e++) t.rc(0);
		}, (t) => {
			t.h(4, ee), (n < 2004 || a) && t.h(3, a), t.h(5, $e(e));
			for (let e of i) t.h(5, 0);
		}, a);
	}, Ii = (e, t) => {
		J(67, t, (t) => {
			Mi(t, e), t.rc(0);
		}, (e) => {
			e.h(4, E), n < 2004 && e.h(3, 0), e.h(5, 0);
		});
	}, Li = (e) => {
		let t = e.vars ?? {}, r = (e, n) => {
			let r = t[e];
			return typeof r == "number" && Number.isFinite(r) ? r : n;
		}, i = (e, t) => Math.round(r(e, t)), a = (e, n = 0) => {
			let r = t[e];
			return r === void 0 ? n : +!!r;
		}, o = (e) => ki(typeof t[e] == "string" ? t[e] : ""), s = (e, t) => {
			let r = i(t, 0) & 255;
			if (n <= 2e3) {
				e.bs(r);
				return;
			}
			e.bs(0), e.bl((r ? 3271557120 | r : 3238002688) >>> 0), e.rc(0);
		}, c = typeof t.DIMTXSTY == "string" ? t.DIMTXSTY : "", l = F.get(c) ?? F.get("Standard") ?? [...F.values()][0], u = ke.get(e.name.toLowerCase()), d = q.get(u)?.h ?? 0;
		J(69, u, (t) => {
			Mi(t, e.name), n <= 14 ? (t.b(a("DIMTOL")), t.b(a("DIMLIM")), t.b(a("DIMTIH", 1)), t.b(a("DIMTOH", 1)), t.b(a("DIMSE1")), t.b(a("DIMSE2")), t.b(a("DIMALT")), t.b(a("DIMTOFL")), t.b(a("DIMSAH")), t.b(a("DIMTIX")), t.b(a("DIMSOXD")), t.rc(i("DIMALTD", 2)), t.rc(i("DIMZIN", 0)), t.b(a("DIMSD1")), t.b(a("DIMSD2")), t.rc(i("DIMTOLJ", 1)), t.rc(i("DIMJUST", 0)), t.rc(i("DIMFIT", 3)), t.b(a("DIMUPT")), t.rc(i("DIMTZIN", 0)), t.rc(i("DIMALTZ", 0)), t.rc(i("DIMALTTZ", 0)), t.rc(i("DIMTAD", 0)), t.bs(i("DIMUNIT", 2)), t.bs(i("DIMAUNIT", 0)), t.bs(i("DIMDEC", 4)), t.bs(i("DIMTDEC", 4)), t.bs(i("DIMALTU", 2)), t.bs(i("DIMALTTD", 2)), t.bd(r("DIMSCALE", 1)), t.bd(r("DIMASZ", .18)), t.bd(r("DIMEXO", .0625)), t.bd(r("DIMDLI", .38)), t.bd(r("DIMEXE", .18)), t.bd(r("DIMRND", 0)), t.bd(r("DIMDLE", 0)), t.bd(r("DIMTP", 0)), t.bd(r("DIMTM", 0)), t.bd(r("DIMTXT", .18)), t.bd(r("DIMCEN", .09)), t.bd(r("DIMTSZ", 0)), t.bd(r("DIMALTF", 25.4)), t.bd(r("DIMLFAC", 1)), t.bd(r("DIMTVP", 0)), t.bd(r("DIMTFAC", 1)), t.bd(r("DIMGAP", .09)), t.t(H(o("DIMPOST"))), t.t(H(o("DIMAPOST"))), t.t(H(o("DIMBLK"))), t.t(H(o("DIMBLK1"))), t.t(H(o("DIMBLK2"))), t.bs(i("DIMCLRD", 0)), t.bs(i("DIMCLRE", 0)), t.bs(i("DIMCLRT", 0))) : (t.t(H(o("DIMPOST"))), t.t(H(o("DIMAPOST"))), t.bd(r("DIMSCALE", 1)), t.bd(r("DIMASZ", .18)), t.bd(r("DIMEXO", .0625)), t.bd(r("DIMDLI", .38)), t.bd(r("DIMEXE", .18)), t.bd(r("DIMRND", 0)), t.bd(r("DIMDLE", 0)), t.bd(r("DIMTP", 0)), t.bd(r("DIMTM", 0)), n >= 2007 && (t.bd(r("DIMFXL", 1)), t.bd(r("DIMJOGANG", .7853981633974483)), t.bs(i("DIMTFILL", 0)), t.bs(0), t.bl(3238002688), t.rc(0)), t.b(a("DIMTOL")), t.b(a("DIMLIM")), t.b(a("DIMTIH", 1)), t.b(a("DIMTOH", 1)), t.b(a("DIMSE1")), t.b(a("DIMSE2")), t.bs(i("DIMTAD", 0)), t.bs(i("DIMZIN", 0)), t.bs(i("DIMAZIN", 0)), n >= 2007 && t.bs(i("DIMARCSYM", 0)), t.bd(r("DIMTXT", .18)), t.bd(r("DIMCEN", .09)), t.bd(r("DIMTSZ", 0)), t.bd(r("DIMALTF", 25.4)), t.bd(r("DIMLFAC", 1)), t.bd(r("DIMTVP", 0)), t.bd(r("DIMTFAC", 1)), t.bd(r("DIMGAP", .09)), t.bd(r("DIMALTRND", 0)), t.b(a("DIMALT")), t.bs(i("DIMALTD", 2)), t.b(a("DIMTOFL")), t.b(a("DIMSAH")), t.b(a("DIMTIX")), t.b(a("DIMSOXD")), s(t, "DIMCLRD"), s(t, "DIMCLRE"), s(t, "DIMCLRT"), t.bs(i("DIMADEC", 0)), t.bs(i("DIMDEC", 4)), t.bs(i("DIMTDEC", 4)), t.bs(i("DIMALTU", 2)), t.bs(i("DIMALTTD", 2)), t.bs(i("DIMAUNIT", 0)), t.bs(i("DIMFRAC", 0)), t.bs(i("DIMLUNIT", 2)), t.bs(i("DIMDSEP", 46)), t.bs(i("DIMTMOVE", 0)), t.bs(i("DIMJUST", 0)), t.b(a("DIMSD1")), t.b(a("DIMSD2")), t.bs(i("DIMTOLJ", 1)), t.bs(i("DIMTZIN", 0)), t.bs(i("DIMALTZ", 0)), t.bs(i("DIMALTTZ", 0)), t.b(a("DIMUPT")), t.bs(i("DIMATFIT", 3)), n >= 2007 && t.b(a("DIMFXLON")), n >= 2010 && (t.b(0), t.bd(r("DIMALTMZF", 100)), t.t(""), t.bd(r("DIMMZF", 100)), t.t("")), t.bs(i("DIMLWD", -2)), t.bs(i("DIMLWE", -2))), t.b(0);
		}, (e) => {
			e.h(4, D), (n < 2004 || d) && e.h(3, d), e.h(5, 0), e.h(5, l), n >= 2e3 && (e.h(5, 0), e.h(5, 0), e.h(5, 0), e.h(5, 0)), n >= 2007 && (e.h(5, 0), e.h(5, 0), e.h(5, 0));
		}, d);
	}, Ri = (e, t) => {
		let r = q.get(t)?.h ?? 0, i = n >= 2e3 && !!(e.ucsOrigin || e.ucsXAxis || e.ucsYAxis);
		J(61, t, (t) => {
			Mi(t, e.name), t.bd(e.height), t.bd(e.width), t.rd(e.center.x), t.rd(e.center.y);
			let r = e.target ?? {
				x: 0,
				y: 0,
				z: 0
			};
			t.bd3(r.x, r.y, r.z ?? 0);
			let a = e.direction ?? {
				x: 0,
				y: 0,
				z: 1
			};
			t.bd3(a.x, a.y, a.z ?? 0), t.bd(e.twist ?? 0), t.bd(e.lensLength ?? 50), t.bd(e.frontClip ?? 0), t.bd(e.backClip ?? 0);
			let o = e.viewMode ?? 0;
			if (t.b(o & 1), t.b(o >> 1 & 1), t.b(o >> 2 & 1), t.b(1), n >= 2e3 && t.rc(e.renderMode ?? 0), n >= 2007 && (t.b(1), t.rc(1), t.bd(0), t.bd(0), t.bs(250), t.bl(0), t.rc(0)), t.b(+!!e.paperSpace), n >= 2e3 && (t.b(+!!i), i)) {
				let n = e.ucsOrigin ?? {
					x: 0,
					y: 0,
					z: 0
				}, r = e.ucsXAxis ?? {
					x: 1,
					y: 0,
					z: 0
				}, i = e.ucsYAxis ?? {
					x: 0,
					y: 1,
					z: 0
				};
				t.bd3(n.x, n.y, n.z ?? 0), t.bd3(r.x, r.y, r.z ?? 0), t.bd3(i.x, i.y, i.z ?? 0), t.bd(e.ucsElevation ?? 0), t.bs(e.ucsOrthoType ?? 0);
			}
			n >= 2007 && t.b(0);
		}, (e) => {
			e.h(4, w), (n < 2004 || r) && e.h(3, r), e.h(5, 0), n >= 2007 && (e.h(4, 0), e.h(5, 0), e.h(3, 0)), i && (e.h(5, 0), e.h(5, 0)), n >= 2007 && e.h(4, 0);
		}, r);
	}, zi = (e, t, r) => {
		let i = q.get(t)?.h ?? 0;
		J(72, t, (t) => {
			t.t(H(ki(e.description ?? ""))), t.bs(+!!/^\*/.test(e.name)), t.bs(e.selectable === !1 ? 0 : 1), t.bl(r.length);
		}, (e) => {
			e.h(4, ie), (n < 2004 || i) && e.h(3, i);
			for (let t of r) e.h(5, t);
		}, i);
	}, Bi = (e) => {
		if (!e || /^bylayer$/i.test(e)) return 32767;
		if (/^byblock$/i.test(e)) return 32766;
		let t = Te.findIndex((t) => t.name.toLowerCase() === e.toLowerCase());
		return t >= 0 ? t : 32767;
	}, Vi = (e) => !e || /^bylayer$/i.test(e) ? se : /^byblock$/i.test(e) ? ce : Ee.get(e) ?? se, Hi = (e, t) => {
		let r = q.get(t)?.h ?? 0, i = e.elements.slice(0, 64), a = (e) => n >= 2e3 && n < 2007 && e ? e + "\0" : e;
		J(73, t, (t) => {
			t.t(a(Ai(Oi(e.name)))), t.t(a(Ai(ki(e.description ?? "")))), t.bs(e.flags ?? 0), Gi(t, e.fillColor ?? { kind: "byLayer" }), t.bd(e.startAngle ?? Math.PI / 2), t.bd(e.endAngle ?? Math.PI / 2), t.rc(i.length);
			for (let e of i) t.bd(e.offset), Gi(t, e.color ?? { kind: "byLayer" }), n < 2018 && t.bs(Bi(e.linetype));
		}, (e) => {
			if (e.h(4, k), (n < 2004 || r) && e.h(3, r), n >= 2018) for (let t of i) e.h(5, Vi(t.linetype));
		}, r);
	}, Ui = (e, t) => {
		let r = q.get(t)?.h ?? 0;
		J(63, t, (t) => {
			if (Mi(t, e.name), t.bd3(e.origin.x, e.origin.y, e.origin.z ?? 0), t.bd3(e.xAxis.x, e.xAxis.y, e.xAxis.z ?? 0), t.bd3(e.yAxis.x, e.yAxis.y, e.yAxis.z ?? 0), n >= 2e3) {
				t.bd(e.elevation ?? 0), t.bs(e.orthoViewType ?? 0);
				let n = e.orthoOrigins ?? [];
				t.bs(n.length);
				for (let e of n) t.bs(e.type), t.bd3(e.origin.x, e.origin.y, e.origin.z ?? 0);
			}
		}, (t) => {
			t.h(4, ne), (n < 2004 || r) && t.h(3, r), t.h(5, 0), n >= 2e3 && (t.h(5, Le(e.baseUcs)), t.h(5, 0));
		}, r);
	}, Wi = (e, t) => {
		let r = q.get(t)?.h ?? 0;
		J(mr, t, (t) => {
			t.rc(e.schema ?? 0), t.t(n >= 2007 ? e.value : H(e.value) + "\0");
		}, (e) => {
			e.h(4, fr), e.h(4, fr), (n < 2004 || r) && e.h(3, r);
		}, r, void 0, 1);
	}, Gi = (e, r, i = !1) => {
		let a = r ?? { kind: "byBlock" };
		if (n >= 2004 || i) {
			e.bs(0);
			let t = a.kind === "byLayer" ? 3221225472 : a.kind === "byBlock" ? 3238002688 : a.kind === "rgb" ? 3254779904 | a.rgb & 16777215 : 3271557120 | a.index & 255;
			e.bl(t >>> 0), e.rc(0);
			return;
		}
		e.bs(a.kind === "byLayer" ? 256 : a.kind === "byBlock" ? 0 : a.kind === "rgb" ? t(a.rgb) : a.index);
	}, Ki = (e) => F.get(e ?? "") ?? F.get("Standard") ?? [...F.values()][0] ?? 0, qi = (e, t) => {
		let r = (e, t, n) => ({
			textHeight: t,
			alignment: n,
			textColor: { kind: "byBlock" },
			fillColor: {
				kind: "aci",
				index: 7
			},
			fillOn: !1,
			dataType: 512,
			unitType: 0,
			...e
		}), i = r(e.data, .18, 2), a = r(e.title, .25, 5), o = r(e.header, .18, 5), s = (e, t) => e.borders?.[t] ?? {}, c = e.horizontalMargin ?? .06, l = e.verticalMargin ?? .06, u = e.description ?? e.name, d = q.get(t)?.h ?? 0;
		if (n < 2010) {
			J(mn, t, (t) => {
				t.t(Ai(u) + (n < 2007 ? "\0" : "")), t.bs(e.flowDirection ?? 0), t.bs(e.flags ?? 0), t.bd(c), t.bd(l), t.b(+!!e.titleSuppressed), t.b(+!!e.headerSuppressed);
				for (let e of [
					i,
					a,
					o
				]) {
					t.bd(e.textHeight ?? .18), t.bs(e.alignment ?? 5), Gi(t, e.textColor, !0), Gi(t, e.fillColor ?? {
						kind: "aci",
						index: 7
					}, !0), t.b(+!!e.fillOn);
					for (let n = 0; n < 6; n++) {
						let r = s(e, n);
						t.bs(r.lineweight ?? -2), t.b(r.visible === !1 ? 0 : 1), Gi(t, r.color, !0);
					}
					n >= 2007 && (t.bl(e.dataType ?? 512), t.bl(e.unitType ?? 0), t.t(Ai(e.format ?? "")));
				}
			}, (e) => {
				e.h(4, bn), (n < 2004 || d) && e.h(3, d);
				for (let t of [
					i,
					a,
					o
				]) e.h(5, Ki(t.textStyle));
			}, d, e.xdata);
			return;
		}
		let f = [
			l,
			c,
			l,
			c,
			.18,
			.18
		], p = (e, t, n, r, i) => {
			e.bl(n ? 5 : 1), e.bs(+!!n), e.bl(i), n && e.bl(r ? 32768 : 0), t.fillOn && t.fillColor ? Gi(e, t.fillColor) : (e.bs(0), e.bl(3355443200), e.rc(0)), e.bl(1), e.bl(0), e.bl(0), e.bl(t.dataType ?? 512), e.bl(t.unitType ?? 0), e.t(t.format ?? ""), e.bd(0), e.bd(1), e.bl(t.alignment ?? 5), Gi(e, t.textColor), e.bd(t.textHeight ?? .18), e.bs(1);
			for (let t of f) e.bd(t);
			if (!n) {
				e.bl(0);
				return;
			}
			e.bl(6);
			for (let n = 0; n < 6; n++) {
				let r = s(t, n);
				e.bl(1 << n), e.bl(0), e.bl(1), Gi(e, r.color), e.bl(r.lineweight ?? -2), e.bl(+(r.visible === !1)), e.bd(.045);
			}
		}, m = [
			[
				1,
				a,
				1,
				"_TITLE"
			],
			[
				2,
				o,
				1,
				"_HEADER"
			],
			[
				3,
				i,
				2,
				"_DATA"
			]
		];
		J(mn, t, (t) => {
			t.rc(0), t.t(u), t.bl(e.flags ?? 0), t.bl(101), t.bl(5), p(t, {
				textHeight: .18,
				alignment: 1,
				textColor: { kind: "byBlock" }
			}, !1, !1, e.flowDirection ? 65536 : 0), t.t("Table"), t.bl(4), t.bl(2), t.bl(m.length);
			for (let [e, n, r, i] of m) t.bl(e), p(t, n, !0, e === 1, 0), t.bl(e), t.bl(r), t.t(i);
		}, (e) => {
			e.h(4, bn), d && e.h(3, d), e.h(3, 0), e.h(5, 0);
			for (let [, t] of m) {
				e.h(5, Ki(t.textStyle));
				for (let t = 0; t < 6; t++) e.h(5, 0);
			}
		}, d, e.xdata);
	}, Ji = (e, t) => {
		let r = "ACAD_MLEADERVER", i = e.xdata?.some((e) => e.appName === r) ? e.xdata : [...e.xdata ?? [], {
			appName: r,
			values: [{
				code: 1070,
				value: 2
			}]
		}], a = q.get(t)?.h ?? 0;
		J(gn, t, (t) => {
			n >= 2010 && t.bs(2), t.bs(e.contentType ?? 2), t.bs(e.drawMLeaderOrder ?? 1), t.bs(e.drawLeaderOrder ?? 0), t.bl(e.maxLeaderPoints ?? 2), t.bd(e.firstSegmentAngle ?? 0), t.bd(e.secondSegmentAngle ?? 0), t.bs(e.leaderType ?? 1), Gi(t, e.lineColor), t.bl(e.lineweight ?? -2), t.b(e.landing === !1 ? 0 : 1), t.bd(e.landingGap ?? .09), t.b(e.dogleg === !1 ? 0 : 1), t.bd(e.doglegLength ?? .36), t.t(Ai(e.description ?? e.name)), t.bd(e.arrowSize ?? .18), t.t(Ai(e.defaultText ?? "")), t.bs(e.textLeftAttachment ?? 1), t.bs(e.textRightAttachment ?? 1), t.bs(e.textAngleType ?? 1), t.bs(e.textAlignment ?? 0), Gi(t, e.textColor), t.bd(e.textHeight ?? .18), t.b(+!!e.textFrame), t.b(+!!e.alwaysAlignLeft), t.bd(e.alignSpace ?? .18), Gi(t, e.blockColor);
			let r = e.blockScale ?? {
				x: 1,
				y: 1,
				z: 1
			};
			t.bd(r.x), t.bd(r.y), t.bd(r.z ?? 1), t.b(e.useBlockScale === !1 ? 0 : 1), t.bd(e.blockRotation ?? 0), t.b(e.useBlockRotation === !1 ? 0 : 1), t.bs(e.blockConnection ?? 0), t.bd(e.scale ?? 1), t.b(+!!e.propertyChanged), t.b(+!!e.annotative), t.bd(e.breakSize ?? .125), n >= 2010 && (t.bs(e.attachmentDirection ?? 0), t.bs(e.bottomAttachment ?? 9), t.bs(e.topAttachment ?? 9)), n >= 2013 && t.b(0);
		}, (t) => {
			t.h(4, xn), (n < 2004 || a) && t.h(3, a), t.h(5, e.linetype && Ee.get(e.linetype) || ce), t.h(5, e.arrowBlock && B.get(e.arrowBlock) || 0), t.h(5, Ki(e.textStyle)), t.h(5, e.blockName && B.get(e.blockName) || 0);
		}, a, i);
	}, Yi = (e) => /^\*[A-Za-z]\d+$/.test(e) ? e.slice(0, 2) : /^\*paper_space.+$/i.test(e) ? "*PAPER_SPACE" : e, Xi = (e, t, r, i, a, o = {
		x: 0,
		y: 0,
		z: 0
	}, s = 0, c = 0, l = !1, u, d = []) => {
		let f = !!u;
		J(49, e, (e) => {
			if (Mi(e, Yi(t), 0, f), e.b(t.startsWith("*") && !/^\*(model_space|paper_space)/i.test(t) ? 1 : 0), e.b(+!!l), e.b(+!!f), e.b(f && u.overlay ? 1 : 0), n >= 2e3 && e.b(0), n >= 2004 && !f && e.bl(a.length), e.bd3(o.x, o.y, o.z ?? 0), e.t(f ? Ai(ki(u.path)) : ""), n >= 2e3) {
				if (f) for (let t of d) e.rc(1);
				e.rc(0), e.t(""), e.bl(0);
			}
			n >= 2007 && (e.bs(0), e.b(1), e.rc(0));
		}, (e) => {
			if (e.h(4, x), (n < 2004 || c) && e.h(3, c), e.h(5, 0), e.h(3, r), !f) {
				if (n < 2004) e.h(4, a[0] ?? 0), e.h(4, a[a.length - 1] ?? 0);
				else for (let t of a) e.h(4, t);
			}
			if (e.h(3, i), n >= 2e3) {
				if (f) for (let t of d) e.h(4, t);
				e.h(5, s);
			}
		}, c);
	}, Zi = (e) => e === L ? 2 : +(e === R), Qi = (e, t, n) => {
		let r = {
			type: "unknown",
			sourceType: "BLOCK",
			layer: me[0].name,
			color: { kind: "byLayer" }
		}, i = Zi(t);
		Y(4, e, r, {
			entmode: i,
			owner: i === 0 ? t : void 0
		}, (e) => {
			e.t(Ai(Oi(Yi(n))));
		});
	}, $i = (e, t) => {
		let n = {
			type: "unknown",
			sourceType: "ENDBLK",
			layer: me[0].name,
			color: { kind: "byLayer" }
		}, r = Zi(t);
		Y(5, e, n, {
			entmode: r,
			owner: r === 0 ? t : void 0
		}, () => {});
	}, ea = (e, t, r, i) => {
		let a = q.get(t)?.h ?? 0, o = new P(), s = hi(o, e), c = fi(o);
		o.h(0, t), o.bs(0), n <= 14 && (s = o.pos, o.rl(0)), o.bl(0), n >= 2004 && o.b(+!a), n >= 2018 && o.b(0), o.bl(r.length), e === 68 && n >= 2e3 && o.rc(0);
		let l = mi(o, c);
		s >= 0 && o.patchRl(s, l), o.h(4, 0), (n < 2004 || a) && o.h(3, a);
		for (let e of r) o.h(2, e);
		i?.(o), gi(o, t, l);
	}, ta = (e, t, r, i = !1) => {
		let a = q.get(e)?.h ?? 0;
		J(42, e, (e) => {
			e.bl(r.length), n >= 2e3 && e.bs(1), n >= 14 && e.rc(+!!i);
			for (let [t] of r) e.t(ji(t));
		}, (e) => {
			e.h(4, t), (n < 2004 || a) && e.h(3, a);
			for (let [, t] of r) e.h(i ? 3 : 2, t);
		}, a);
	}, na = {
		line: 19,
		point: 27,
		circle: 18,
		arc: 17,
		ellipse: 35,
		ray: 40,
		xline: 41,
		solid: 31,
		face3d: 28,
		polyline: 77,
		spline: 36,
		text: 1,
		mtext: 44,
		shape: 33,
		hatch: 78,
		ole: 74
	}, ra = (e) => {
		try {
			let t = new te(e);
			if (n < 2018) return t.bs();
			switch (t.bb()) {
				case 0: return t.rc();
				case 1: return t.rc() + 496;
				case 2: return t.rs();
				default: return -1;
			}
		} catch {
			return -1;
		}
	}, ia = (e, t) => {
		if (!c || !_) return;
		let r = e.record;
		if (!r || !r.data || r.encoding !== Ce(n) || e.type === "insert" && e.attributes?.length) return;
		let i = e.type === "insert" ? (e.columnCount ?? 1) > 1 || (e.rowCount ?? 1) > 1 ? 8 : 7 : na[e.type];
		if (i === void 0 || e.xdata?.length || e.xdict && !q.has(t) || Qr.has(t) || e.reactors?.some((e) => Fr(e) === void 0) || !e.handle || parseInt(e.handle, 16) !== t || n <= 2002 && !y || n >= 2018 && r.handleBits === void 0) return;
		let a = V(r.data);
		if (a.length && ra(a) === i) return {
			handle: t,
			bytes: a,
			handleBits: n >= 2018 ? r.handleBits : void 0
		};
	}, aa = (e, t, n, r) => {
		e.forEach((e, i) => {
			let a = ia(e, t[i]);
			if (a) {
				ii.push(a);
				return;
			}
			Ei(e, t[i], {
				entmode: n,
				owner: n === 0 ? r : void 0,
				prev: t[i - 1] ?? 0,
				next: t[i + 1] ?? 0
			});
		});
	};
	ea(48, x, z.map((e) => B.get(e)), (e) => {
		e.h(3, L), e.h(3, R);
	}), ea(50, S, me.map((e) => he.get(e.name))), ea(52, C, ve.map((e) => F.get(e.name))), ea(56, ee, Te.map((e) => Ee.get(e.name)), (e) => {
		e.h(3, ce), e.h(3, se);
	}), ea(60, w, Me), ea(62, ne, Ie), ea(64, T, [le]), ea(66, E, [ae, ...Gt.map((e) => e.handle)]), ea(68, D, Oe.map((e) => ke.get(e.name.toLowerCase()))), n <= 2e3 && ea(70, re, []), ta(O, 0, [
		...n >= 2e3 ? [["ACAD_LAYOUT", A]] : [],
		["ACAD_GROUP", ie],
		["ACAD_MLINESTYLE", k],
		...dn ? [["ACAD_TABLESTYLE", bn]] : [],
		...fn ? [["ACAD_MLEADERSTYLE", xn]] : [],
		...dr ? [["ACDBVARIABLEDICTIONARY", fr]] : [],
		...kn ? [["ACDB_RECOMPOSE_DATA", kn]] : [],
		...G ? [["ACAD_GEOGRAPHICDATA", Nn]] : [],
		...Pn.flatMap((e, t) => Lr(e) ? [[e.name ?? `PROXY_OBJECT_${t + 1}`, Fn[t]]] : []),
		...jr.flatMap((e, t) => Lr(e) ? [[e.name ?? `SEALED_OBJECT_${t + 1}`, Mr[t]]] : [])
	].reduce((e, [t, n]) => {
		let r = t;
		for (let n = 2; e.some(([e]) => e === r); n++) r = `${t}~${n}`;
		return e.push([r, n]), e;
	}, []));
	{
		let e = /* @__PURE__ */ new Set();
		ta(ie, O, Ne.map((t, n) => {
			let r = t.name || "*A";
			for (let n = 2; e.has(r.toLowerCase()); n++) r = `${t.name || "*A"}${n}`;
			return e.add(r.toLowerCase()), [r, Pe[n]];
		})), Ne.forEach((e, t) => {
			let n = e.entityHandles.map((e) => Fr(e)).filter((e) => e !== void 0);
			zi(e, Pe[t], n);
		});
	}
	if (je.forEach((e, t) => Ri(e, Me[t])), Fe.forEach((e, t) => Ui(e, Ie[t])), kn) {
		let e = [...new Set([...Dn, ...$r.keys()].map((e) => dt.get(e)).filter((e) => e !== void 0))].sort((e, t) => e - t);
		J(On(), kn, (t) => {
			t.bl(6 + 10 * e.length), t.rs(90), t.rl(1);
			for (let n of e) t.rs(330), t.rll(n);
			n >= 2e3 && t.bs(1);
		}, (e) => {
			e.h(4, O), n < 2004 && e.h(3, 0);
		});
	}
	ta(k, O, Be.map((e) => [e.name, Ve.get(e.name.toLowerCase())])), dr && (ta(fr, O, sr.map((e, t) => [e.name, pr[t]])), sr.forEach((e, t) => Wi(e, pr[t])));
	for (let [e, t] of $r) {
		let r = dt.get(e);
		t.fresh && ta(t.dict, r, t.entries.map(([e, t]) => [e, t]), !0);
		for (let [, e, r] of t.entries) J(On(), e, (e) => {
			di(e, r), n >= 2e3 && e.bs(1);
		}, (e) => {
			e.h(4, t.dict), e.h(4, t.dict), n < 2004 && e.h(3, 0);
		}, 0, void 0, 1);
	}
	if (dn) {
		ta(bn, O, vn.map((e) => [e.name, wn(e.name)]));
		for (let e of vn) qi(e, wn(e.name));
	}
	if (fn) {
		ta(xn, O, yn.map((e) => [e.name, Tn(e.name)]));
		for (let e of yn) Ji(e, Tn(e.name));
	}
	let oa = /* @__PURE__ */ new Map();
	if (n >= 2e3) {
		let e = Je?.name ?? "Layout1", t = /* @__PURE__ */ new Set(["model", e.toLowerCase()]), r = Xe.map(({ nm: e, meta: n, h: r }, i) => {
			let a = n?.name ?? "Layout", o = n?.name ?? a + (i + 2);
			for (let e = 2; t.has(o.toLowerCase()); e++) o = a + e;
			return t.add(o.toLowerCase()), oa.set(e, r), {
				nm: e,
				h: r,
				name: o,
				meta: n,
				tabOrder: n?.tabOrder ?? i + 2
			};
		});
		ta(A, O, [
			["Model", I],
			[e, Ye],
			...r.map((e) => [e.name, e.h])
		]);
		let i = (e, t, r, i, a) => {
			let o = q.get(e)?.h ?? 0;
			J(82, e, (e) => {
				e.t(""), e.t(""), e.bs(0);
				for (let t = 0; t < 6; t++) e.bd(0);
				e.t(""), e.bd(0), e.bd(0), e.bs(0), e.bs(0), e.bs(0), e.bd(0), e.bd(0), e.bd(0), e.bd(0), n <= 2002 && e.t(""), e.bd(1), e.bd(1), e.t(""), e.bs(0), e.bd(1), e.bd(0), e.bd(0), n >= 2004 && (e.bs(0), e.bs(0), e.bs(0)), e.t(Ai(t)), e.bs(r), e.bs(1);
				let i = a?.insBase ?? {
					x: 0,
					y: 0,
					z: 0
				};
				e.bd3(i.x, i.y, i.z ?? 0), e.rd(a?.limMin?.x ?? 0), e.rd(a?.limMin?.y ?? 0), e.rd(a?.limMax?.x ?? 12), e.rd(a?.limMax?.y ?? 9), e.bd3(0, 0, 0), e.bd3(1, 0, 0), e.bd3(0, 1, 0), e.bd(0), e.bs(0), e.bd3(0, 0, 0), e.bd3(0, 0, 0), n >= 2004 && e.bl(0);
			}, (e) => {
				e.h(4, A), (n < 2004 || o) && e.h(3, o), n >= 2004 && e.h(4, 0), n >= 2007 && e.h(4, 0), e.h(4, i), e.h(4, 0), e.h(5, 0), e.h(5, 0);
			}, o);
		};
		i(I, "Model", qe?.tabOrder ?? 0, L, qe), i(Ye, e, Je?.tabOrder ?? 1, R, Je);
		for (let e of r) i(e.h, e.name, e.tabOrder, B.get(e.nm), e.meta);
	}
	{
		let e = j, t = q.get(le)?.h ?? 0, r = (e, t, n) => e ? [e.x, e.y] : [t, n], i = (e, t) => e ? [
			e.x,
			e.y,
			e.z ?? 0
		] : [
			t[0],
			t[1],
			t[2]
		];
		J(65, le, (t) => {
			Mi(t, "*Active");
			let a = e?.height && e.height > 0 ? e.height : 100;
			t.bd(e?.height ?? 100), t.bd((e?.aspectRatio && e.aspectRatio > 0 ? e.aspectRatio : 1.5) * a);
			let [s, c] = r(e?.center, 50, 50);
			t.rd(s), t.rd(c);
			let [l, u, d] = i(e?.target, [
				0,
				0,
				0
			]);
			t.bd3(l, u, d);
			let [f, p, m] = i(e?.direction, [
				0,
				0,
				1
			]);
			t.bd3(f, p, m), t.bd(e?.twist ?? 0), t.bd(e?.lensLength ?? 50), t.bd(e?.frontClip ?? 0), t.bd(e?.backClip ?? 0);
			let h = e?.viewMode ?? 0;
			t.b(h & 1), t.b(h >> 1 & 1), t.b(h >> 2 & 1), t.b(1), n >= 2e3 && t.rc(e?.renderMode ?? 0), n >= 2007 && (t.b(1), t.rc(1), t.bd(0), t.bd(0), t.bs(250), t.bl(0), t.rc(0));
			let [g, _] = r(e?.lowerLeft, 0, 0), [v, y] = r(e?.upperRight, 1, 1);
			t.rd(g), t.rd(_), t.rd(v), t.rd(y), t.b(+!!e?.ucsFollow), t.bs(e?.circleSides ?? 1e3), t.b(e?.fastZoom === !1 ? 0 : 1);
			let b = e?.ucsIcon ?? 3;
			t.b(b & 1), t.b(b >> 1 & 1), t.b(+!!e?.gridOn);
			let [x, S] = r(e?.gridSpacing, 10, 10);
			t.rd(x), t.rd(S), t.b(+!!e?.snapOn), t.b(e?.snapStyle ?? 0), t.bs(e?.snapIsoPair ?? 0), t.bd(e?.snapAngle ?? 0);
			let [C, ee] = r(e?.snapBase, 0, 0);
			t.rd(C), t.rd(ee);
			let [te, w] = r(e?.snapSpacing, 10, 10);
			if (t.rd(te), t.rd(w), n >= 2e3) {
				t.b(b >> 2 & 1), t.b(e?.ucsPerViewport === !1 ? 0 : 1);
				let n = o.header.ucs, [r, a, s] = i(e?.ucsOrigin ?? n?.origin, [
					0,
					0,
					0
				]), [c, l, u] = i(e?.ucsXAxis ?? n?.xAxis, [
					1,
					0,
					0
				]), [d, f, p] = i(e?.ucsYAxis ?? n?.yAxis, [
					0,
					1,
					0
				]);
				t.bd3(r, a, s), t.bd3(c, l, u), t.bd3(d, f, p), t.bd(e?.ucsElevation ?? 0), t.bs(e?.ucsOrthoType ?? 0);
			}
			n >= 2007 && (t.bs(3), t.bs(5));
		}, (e) => {
			e.h(4, T), (n < 2004 || t) && e.h(3, t), e.h(5, 0), n >= 2007 && (e.h(4, 0), e.h(5, 0), e.h(3, 0)), n >= 2e3 && (e.h(5, 0), e.h(5, 0));
		}, t);
	}
	Pn.forEach((e, t) => {
		let r = e.appClass?.dxfName ?? e.sourceType ?? "ACAD_PROXY_OBJECT", i = U.get(r), a = Fn[t], o = (e.reactors ?? []).map((e) => Fr(e)).filter((e) => e !== void 0), s = q.get(a)?.h ?? 0, c = (t) => {
			t.h(4, Ir(e) ?? O);
			for (let e of o) t.h(4, e);
			(n < 2004 || s) && t.h(3, s);
			for (let n of e.refs ?? []) t.h(n.code, g(n.value));
		};
		if (!e.data && i) {
			J(i.num, a, () => {}, c, s, e.xdata, o.length);
			return;
		}
		J(499, a, (t) => {
			let r = e.appClass?.cppName ?? "AcDbObject", a = e.proxyVersion ?? 0;
			oi(t, i?.num ?? 499, r, a & 65535, e.proxyMaint ?? a >>> 16, !!e.fromDxf), n >= 2007 && (e.strData && e.strBits ? t.strTarget?.putBits(V(e.strData), e.strBits) : si(t, r)), e.data && e.dataBits && ci(t, e.data, e.dataBits, !!e.fromDxf, i?.num);
		}, c, s, e.xdata, o.length);
	}), jr.forEach((e, t) => {
		let r = e.appClass?.dxfName ?? e.sourceType, i = Mr[t], a = Ir(e) ?? O, o = (e.reactors ?? []).filter((t) => !(Jn(e) && a === O && t.toUpperCase() === e.ownerHandle?.toUpperCase())).map((e) => Fr(e)).filter((e) => e !== void 0), s = q.get(i)?.h ?? 0, c = (e) => {
			e.h(4, a);
			for (let t of o) e.h(4, t);
			(n < 2004 || s) && e.h(3, s);
		};
		if (Ln(e)) {
			let t = zr.get(i) ?? [], r = new Set(t.map(([e]) => e.toUpperCase())), a = e.hardOwner ? 3 : 2, l = [];
			for (let t of e.entries ?? []) {
				if (r.has(t.name.toUpperCase()) || !Cr(e, t)) continue;
				let n = Fr(t.handle);
				if (n === void 0) continue;
				let i = t.code !== void 0 && t.code >= 2 && t.code <= 5 ? t.code : a;
				l.push([
					t.name,
					n,
					i
				]);
			}
			for (let [e, n] of t) l.push([
				e,
				n,
				a
			]);
			let u = Rn(e), d = u ? W("ACDBDICTIONARYWDFLT", "AcDbDictionaryWithDefault", "ObjectDBX Classes", !1) : 42;
			J(d, i, (t) => {
				t.bl(l.length), n >= 2e3 && t.bs(e.cloning ?? 1), n >= 14 && t.rc(+!!e.hardOwner);
				for (let [e] of l) t.t(ji(e));
			}, (t) => {
				c(t);
				for (let [, e, n] of l) t.h(n, e);
				u && t.h(5, Fr(e.defaultHandle) ?? 0);
			}, s, e.xdata, o.length);
			return;
		}
		let l = (t) => {
			c(t);
			for (let n of e.refs ?? []) t.h(n.code, g(n.value));
		};
		if (K(e) === "ACDBPLACEHOLDER") {
			J(80, i, () => {}, l, s, e.xdata, o.length);
			return;
		}
		let u = e.encoding === Ce(n) ? void 0 : Un(e);
		if (u) {
			J(On(), i, (e) => {
				di(e, u), n >= 2e3 && e.bs(1);
			}, l, s, e.xdata, o.length);
			return;
		}
		if (rt(e)) {
			let t = U.get(r)?.num ?? 499, n = e.appClass?.cppName ?? "AcDbObject", a = () => {};
			J(499, i, (r) => {
				oi(r, t, n, er, 2147483646, !0), si(r, n), a = ui(r, e, 499, t);
			}, (e) => {
				c(e), a(e);
			}, s, e.xdata, o.length);
			return;
		}
		if (e.encoding === Ce(n) || e.data === void 0) J(zn(e) && n <= 14 ? On() : e.typeCode ?? U.get(r)?.num ?? 499, i, (t) => {
			e.data && e.dataBits && t.putBits(V(e.data), e.dataBits), e.strData && e.strBits && t.strTarget?.putBits(V(e.strData), e.strBits);
		}, l, s, e.xdata, o.length);
		else if (Kn(e)) {
			let t = e.appClass?.cppName ?? "AcDbObject";
			J(499, i, (n) => {
				oi(n, U.get(r)?.num ?? 499, t, Qn(e.encoding), 0, !1), si(n, t), li(n, e);
			}, l, s, e.xdata, o.length);
		} else J(499, i, (t) => {
			t.bl(e.typeCode === void 0 ? U.get(r)?.num ?? 0 : 0), t.bl((we | (e.encoding ?? 0)) >>> 0), n >= 2018 && t.bl(0), n >= 2e3 && t.b(0), ai(t, e, e.appClass?.cppName ?? "AcDbObject");
		}, l, s, e.xdata, o.length);
	});
	for (let e of me) Ni(e);
	for (let e of ve) Pi(e);
	Fi("ByLayer", se), Fi("ByBlock", ce);
	for (let e of Te) Fi(e.name, Ee.get(e.name), e);
	Ii("ACAD", ae);
	for (let e of Gt) Ii(e.name, e.handle);
	for (let e of Oe) Li(e);
	for (let e of Be) Hi(e, Ve.get(e.name.toLowerCase()));
	Xi(L, "*MODEL_SPACE", Kt, qt, pt, void 0, n >= 2e3 ? I : 0, Xr.get(L)?.dict ?? q.get(L)?.h), Xi(R, "*PAPER_SPACE", Jt, Yt, mt, void 0, n >= 2e3 ? Ye : 0, Xr.get(R)?.dict ?? q.get(R)?.h);
	for (let e of z) {
		let t = B.get(e);
		Xi(t, e, Xt.get(e), Zt.get(e), ht.get(e), o.blocks[e].basePoint, oa.get(e) ?? 0, Xr.get(t)?.dict ?? Zr.get(t)?.dict ?? q.get(t)?.h, ut.get(e).some((e) => e.type === "text" && e.attribute === "attdef"), et(e) ? o.blocks[e].xref : void 0, et(e) ? Dt(e) : []);
	}
	Qi(Kt, L, "*MODEL_SPACE"), $i(qt, L), Qi(Jt, R, "*PAPER_SPACE"), $i(Yt, R);
	for (let e of z) Qi(Xt.get(e), B.get(e), e), $i(Zt.get(e), B.get(e));
	aa(st, pt, 2, L), aa(lt, mt, 1, R);
	for (let e of z) aa(ut.get(e), ht.get(e), 0, B.get(e));
	for (let e of z) {
		if (kr.includes(e) || Or(e)) continue;
		let t = o.blocks[e], n = t.parameters?.length ?? 0, r = t.actions?.length ?? 0;
		(n || r) && it.push(`dynamic block ${e}: ${n} parameter(s) and ${r} action(s) written static`);
	}
	for (let e of kr) {
		let t = o.blocks[e];
		if (n <= 14) {
			i.push(`dynamic-block visibility of ${e} (needs R2000 or later)`);
			continue;
		}
		let r = B.get(e), a = Zr.get(r), s = t.parameters?.length ?? 0, c = t.actions?.length ?? 0;
		(s || c) && it.push(`dynamic block ${e}: visibility states kept, ${s} parameter(s) and ${c} action(s) written static`);
		let l = ut.get(e), u = ht.get(e), d = /* @__PURE__ */ new Map();
		l.forEach((e, t) => {
			e.handle && d.set(e.handle.toUpperCase(), u[t]);
		});
		let f = (e) => e.map((e) => d.get(e.toUpperCase())).filter((e) => e !== void 0), p = t.visibilityStates.map((e) => ({
			name: e.name,
			visible: f(e.visible)
		})), m = t.basePoint?.x ?? 0, h = t.basePoint?.y ?? 0, g = t.basePoint?.z ?? 0, _ = (e, t) => {
			e.bl(-1), e.bl(33), e.bl(427), e.bs(-9999), e.bl(t);
		}, v = (e) => {
			n < 2004 && e.h(3, 0);
		}, y = [["ACAD_ENHANCEDBLOCK", a.graph]], b = Xr.get(r);
		b && y.push(["ACAD_SORTENTS", b.table]), y.push(["AcDbDynamicBlockRoundTripPurgePreventer", a.purge]), Rr.has(a.dict) || J(42, a.dict, (e) => {
			e.bl(y.length), n >= 2e3 && e.bs(1), n >= 14 && e.rc(1);
			for (let [t] of y) e.t(ji(t));
		}, (e) => {
			e.h(4, r), v(e);
			for (let [, t] of y) e.h(3, t);
		}), J(Ur, a.graph, (e) => {
			e.bl(12), e.bl(12);
			let t = [
				[9, [
					0,
					0,
					1,
					2
				]],
				[10, [
					-1,
					-1,
					0,
					0
				]],
				[11, [
					1,
					1,
					-1,
					-1
				]],
				[12, [
					2,
					2,
					-1,
					-1
				]]
			];
			e.bl(t.length), t.forEach(([t, n], r) => {
				e.bl(r), e.bl(32), e.bl(t);
				for (let t of n) e.bl(t);
			});
			let n = [
				[
					1,
					0,
					[
						-1,
						-1,
						-1,
						-1,
						-1
					]
				],
				[
					0,
					2,
					[
						-1,
						-1,
						-1,
						2,
						-1
					]
				],
				[
					0,
					3,
					[
						-1,
						-1,
						1,
						-1,
						-1
					]
				]
			];
			e.bl(n.length), n.forEach(([t, n, r], i) => {
				e.bl(i), e.bl(0), e.bl(1), e.bl(t), e.bl(n);
				for (let t of r) e.bl(t);
			});
		}, (e) => {
			e.h(4, a.dict), v(e);
			for (let t of [
				a.param,
				a.grip,
				a.gripX,
				a.gripY
			]) e.h(3, t);
		}), J(Hr, a.param, (e) => {
			_(e, 9), e.t(H("Visibility")), e.bl(33), e.bl(427), e.bl(0), e.b(1), e.b(0), e.bd3(m, h, g), e.bl(0), e.bl(0), e.bl(10), e.b(1), e.t(H(t.visibilityName ?? "Visibility")), e.t(H(t.visibilityPrompt ?? "")), e.b(0), e.bl(u.length), e.bl(p.length);
			for (let t of p) e.t(H(t.name)), e.bl(t.visible.length), e.bl(2);
		}, (e) => {
			e.h(4, a.graph), v(e);
			for (let t of u) e.h(4, t);
			for (let t of p) {
				for (let n of t.visible) e.h(4, n);
				e.h(4, a.param), e.h(4, a.grip);
			}
		}), J(Wr, a.grip, (e) => {
			_(e, 10), e.t(H("Grip")), e.bl(33), e.bl(427), e.bl(0), e.bl(11), e.bl(12), e.bd3(m, h, g), e.b(0), e.bl(-1);
		}, (e) => {
			e.h(4, a.graph), v(e);
		});
		let x = [[
			a.gripX,
			11,
			"UpdatedX"
		], [
			a.gripY,
			12,
			"UpdatedY"
		]];
		for (let [e, t, n] of x) J(Gr, e, (e) => {
			_(e, t), e.bl(9), e.t(H(n));
		}, (e) => {
			e.h(4, a.graph), v(e);
		});
		J(Kr, a.purge, (e) => {
			e.bs(1);
		}, (e) => {
			e.h(4, a.dict), v(e), e.h(5, r);
		});
	}
	for (let { block: e, hs: t } of Jr) {
		let { dict: r, table: i } = Xr.get(e);
		!Zr.has(e) && !Rr.has(r) && ta(r, e, [["ACAD_SORTENTS", i]]);
		let a = [...t].sort((e, t) => e - t);
		J(Yr, i, (e) => {
			e.bl(t.length);
			for (let t of a) e.h(0, t);
		}, (i) => {
			i.h(4, r), n < 2004 && i.h(3, 0), i.h(4, e);
			for (let e of t) i.h(4, e);
		});
	}
	G && J(Mn, Nn, (e) => {
		e.bl(G.version ?? 3), e.bs(G.coordinatesType ?? 1);
		let t = (t) => {
			e.bd3(t?.x ?? 0, t?.y ?? 0, t?.z ?? 0);
		};
		t(G.designPoint), t(G.referencePoint), e.bd(G.horizontalUnitScale ?? 1), e.bl(G.horizontalUnits ?? 1), e.bd(G.verticalUnitScale ?? G.horizontalUnitScale ?? 1), e.bl(G.verticalUnits ?? G.horizontalUnits ?? 1), t(G.upDirection ?? {
			x: 0,
			y: 0,
			z: 1
		});
		let n = G.northDirection ?? {
			x: 0,
			y: 1
		};
		e.rd(n.x), e.rd(n.y), e.bl(G.scaleEstimation ?? 1), e.bd(G.userScaleFactor ?? 1), e.b(+!!G.seaLevelCorrection), e.bd(G.seaLevelElevation ?? 0), e.bd(G.projectionRadius ?? 0), e.t(H(G.coordinateSystem ?? "")), e.t(H(G.geoRssTag ?? (G.latitude === void 0 ? "" : `<georss:point>${G.latitude} ${G.longitude ?? 0}</georss:point>`))), e.t(""), e.t(""), e.t(""), e.bl(0), e.bl(0);
	}, (e) => {
		e.h(4, O), n < 2004 && e.h(3, 0), e.h(5, L);
	});
	for (let [e, t] of ti) {
		let [r, i, a] = e.split("|");
		J(jn.get(r).def, t, (e) => {
			e.t(H(i)), e.t(H(a));
		}, (e) => {
			e.h(4, 0), n < 2004 && e.h(3, 0);
		});
	}
	for (let [e, t] of rn) {
		let r = e.slice(0, e.lastIndexOf("|")), i = e.slice(e.lastIndexOf("|") + 1).split("x");
		J(cn, t, (e) => {
			e.bl(0), e.rd(parseFloat(i[0]) || 1), e.rd(parseFloat(i[1]) || 1), e.t(H(r)), e.b(1), e.rc(0), e.rd(1), e.rd(1);
		}, (e) => {
			e.h(4, 0), n < 2004 && e.h(3, 0);
		});
	}
	let sa = u + 1, ca = n >= 2007 ? new P() : null, la = n >= 2007 ? new P() : null, ua = new P();
	{
		let e = ua;
		la && (la.utf16 = !0, e.utf16 = !0, e.strTarget = la);
		let t = (t, n) => (ca ?? e).h(t, n), r = (e, t) => {
			let n = o.header.vars?.[e];
			if (typeof n == "number" && Number.isFinite(n)) return n;
			let r = sr.find((t) => t.name.toLowerCase() === e.toLowerCase()), i = r ? Number(r.value) : NaN;
			return Number.isFinite(i) ? i : t;
		};
		n >= 2013 && e.bll(0), e.bd(412148564080), e.bd(1), e.bd(1), e.bd(1), e.t(n >= 2007 ? "m" : "m\0"), e.t(""), e.t(""), e.t(""), e.bl(0), e.bl(0), n <= 14 && e.bs(256), n < 2004 && e.h(5, 0), e.b(1), e.b(1), n <= 14 && e.b(0), e.b(0), e.b(0), e.b(1), e.b(1), e.b(0), e.b(1), e.b(0), n <= 14 && e.b(0), n >= 2004 && e.b(0), e.b(1), e.b(0), e.b(0), e.b(0), n <= 14 && (e.b(1), e.b(0)), e.b(0), e.b(1), n <= 14 && e.b(0), e.b(1), e.b(0), e.b(1), n <= 14 && e.b(1), e.b(0), e.b(0), e.bs(1), n <= 14 && e.bs(2), e.bs(3020), e.bs(2), e.bs(4), e.bs(0), e.bs(0), n <= 14 && e.bs(0), e.bs(1), n <= 14 && e.bs(1), e.bs(Math.round(r("PDMODE", 0))), n <= 14 && e.bs(1), n >= 2004 && (e.bl(0), e.bl(0), e.bl(0));
		for (let t = 0; t < 5; t++) e.bs(0);
		e.bs(8), e.bs(6), e.bs(6), e.bs(6), e.bs(6), e.bs(6), e.bs(6), e.bs(3), e.bs(70), e.bs(0), e.bs(64), e.bs(4), e.bs(0), e.bs(50), e.bd(o.header.linetypeScale ?? 1), e.bd(2.5), e.bd(1), e.bd(1), e.bd(0), e.bd(0), e.bd(0), e.bd(r("PDSIZE", 0)), e.bd(0);
		for (let t = 0; t < 5; t++) e.bd(0);
		for (let t = 0; t < 4; t++) e.bd(0);
		e.bd(.5), e.bd(1), e.bd(1), e.t(n >= 2007 ? "." : ".\0"), e.bl(2451545), e.bl(0), e.bl(2451545), e.bl(0), n >= 2004 && (e.bl(0), e.bl(0), e.bl(0)), e.bl(0), e.bl(0), e.bl(0), e.bl(0), n >= 2004 ? (e.bs(0), e.bl(3221225472), e.rc(0)) : e.bs(256), e.h(0, sa), t(5, he.get("0") ?? [...he.values()][0]), t(5, F.get("Standard") ?? [...F.values()][0]), t(5, se), n >= 2007 && t(5, 0), t(5, Ae), t(5, Ue(o.header.vars?.CMLSTYLE)), n >= 2e3 && e.bd(0), e.bd3(0, 0, 0), e.bd3(0, 0, 0), e.bd3(0, 0, 0), e.rd(0), e.rd(0), e.rd(12), e.rd(9), e.bd(0);
		let i = o.header.pUcs;
		if (e.bd3(i?.origin.x ?? 0, i?.origin.y ?? 0, i?.origin.z ?? 0), e.bd3(i?.xAxis.x ?? 1, i?.xAxis.y ?? 0, i?.xAxis.z ?? 0), e.bd3(i?.yAxis.x ?? 0, i?.yAxis.y ?? 1, i?.yAxis.z ?? 0), t(5, Le(o.header.vars?.PUCSNAME)), n >= 2e3) {
			t(5, 0), e.bs(0), t(5, 0);
			for (let t = 0; t < 6; t++) e.bd3(0, 0, 0);
		}
		let a = {
			min: o.header.extMin ?? {
				x: 0x56bc75e2d63100000,
				y: 0x56bc75e2d63100000,
				z: 0
			},
			max: o.header.extMax ?? {
				x: -0x56bc75e2d63100000,
				y: -0x56bc75e2d63100000,
				z: 0
			}
		};
		e.bd3(0, 0, 0), e.bd3(a.min.x, a.min.y, a.min.z ?? 0), e.bd3(a.max.x, a.max.y, a.max.z ?? 0);
		let s = {
			min: o.header.limMin ?? {
				x: 0,
				y: 0
			},
			max: o.header.limMax ?? {
				x: 420,
				y: 297
			}
		};
		e.rd(s.min.x), e.rd(s.min.y), e.rd(s.max.x), e.rd(s.max.y), e.bd(0);
		let c = o.header.ucs;
		if (e.bd3(c?.origin.x ?? 0, c?.origin.y ?? 0, c?.origin.z ?? 0), e.bd3(c?.xAxis.x ?? 1, c?.xAxis.y ?? 0, c?.xAxis.z ?? 0), e.bd3(c?.yAxis.x ?? 0, c?.yAxis.y ?? 1, c?.yAxis.z ?? 0), t(5, Le(o.header.vars?.UCSNAME)), n >= 2e3) {
			t(5, 0), e.bs(0), t(5, 0);
			for (let t = 0; t < 6; t++) e.bd3(0, 0, 0);
			e.t(""), e.t("");
		}
		if (n <= 14 && (e.b(0), e.b(0), e.b(0), e.b(0), e.b(0), e.b(0), e.b(0), e.b(1), e.b(0), e.b(0), e.b(0), e.rc(3), e.rc(8), e.b(0), e.b(0), e.rc(0), e.rc(0), e.rc(3), e.b(0), e.rc(8), e.rc(0), e.rc(0), e.rc(1), e.bs(2), e.bs(0), e.bs(Math.round(r("DIMDEC", 2))), e.bs(2), e.bs(2), e.bs(3), t(5, F.get("Standard") ?? [...F.values()][0])), e.bd(r("DIMSCALE", 1)), e.bd(r("DIMASZ", 2.5)), e.bd(r("DIMEXO", .625)), e.bd(r("DIMDLI", 3.75)), e.bd(r("DIMEXE", 1.25)), e.bd(r("DIMRND", 0)), e.bd(r("DIMDLE", 0)), e.bd(r("DIMTP", 0)), e.bd(r("DIMTM", 0)), n >= 2007 && (e.bd(1), e.bd(.7853981633974483), e.bs(0), e.bs(0), e.bl(3238002688), e.rc(0)), n >= 2e3 && (e.b(0), e.b(0), e.b(0), e.b(0), e.b(0), e.b(0), e.bs(1), e.bs(8), e.bs(0)), n >= 2007 && e.bs(0), e.bd(r("DIMTXT", 2.5)), e.bd(r("DIMCEN", 2.5)), e.bd(r("DIMTSZ", 0)), e.bd(r("DIMALTF", .03937007874016)), e.bd(r("DIMLFAC", 1)), e.bd(r("DIMTVP", 0)), e.bd(r("DIMTFAC", 1)), e.bd(r("DIMGAP", .625)), n <= 14 && (e.t(""), e.t(""), e.t(""), e.t(""), e.t("")), n >= 2e3 && (e.bd(0), e.b(0), e.bs(3), e.b(1), e.b(0), e.b(0), e.b(0)), n >= 2004) for (let t = 0; t < 3; t++) e.bs(0), e.bl(3238002688), e.rc(0);
		else e.bs(0), e.bs(0), e.bs(0);
		if (n >= 2e3 && (e.bs(0), e.bs(Math.round(r("DIMDEC", 2))), e.bs(2), e.bs(2), e.bs(3), e.bs(0), e.bs(0), e.bs(2), e.bs(44), e.bs(0), e.bs(0), e.b(0), e.b(0), e.bs(0), e.bs(8), e.bs(0), e.bs(0), e.b(0), e.bs(3)), n >= 2007 && e.b(0), n >= 2010 && (e.b(0), e.bd(100), e.t(""), e.bd(100), e.t("")), n >= 2e3 && (t(5, F.get("Standard") ?? [...F.values()][0]), t(5, 0), t(5, 0), t(5, 0), t(5, 0), n >= 2007 && (t(5, 0), t(5, 0), t(5, 0)), e.bs(-2), e.bs(-2)), t(3, x), t(3, S), t(3, C), t(3, ee), t(3, w), t(3, ne), t(3, T), t(3, E), t(3, D), n <= 2e3 && t(3, re), t(5, ie), t(5, k), t(3, O), n >= 2e3) {
			e.bs(1), e.bs(70), e.t(""), e.t(""), t(5, A), t(5, 0), t(5, Nr), n >= 2004 && (t(5, 0), t(5, 0)), n >= 2007 && t(5, 0), n >= 2013 && t(5, 0), e.bl(10781), e.bs(o.header.insUnits ?? 4), e.bs(0);
			let r = "{00000000-0000-0000-0000-000000000000}" + (n >= 2007 ? "" : "\0");
			e.t(r), e.t(r);
		}
		n >= 2004 && (e.rc(r("SORTENTS", 127)), e.rc(0), e.rc(r("HIDETEXT", 1)), e.rc(r("XCLIPFRAME", 2)), e.rc(r("DIMASSOC", 2)), e.rc(r("HALOGAP", 0)), e.bs(257), e.bs(257), e.rc(0), e.rc(0), e.t("")), t(5, R), t(5, L), t(5, se), t(5, ce), t(5, De), n >= 2007 && (e.b(+(o.header.vars?.CAMERADISPLAY === !0)), e.bl(0), e.bl(10), e.bd(1), e.bd(r("STEPSPERSEC", 2)), e.bd(r("STEPSIZE", 6)), e.bd(r("3DDWFPREC", 2)), e.bd(r("LENSLENGTH", 50)), e.bd(r("CAMERAHEIGHT", 0)), e.rc(r("SOLIDHIST", 0)), e.rc(r("SHOWHIST", 1)), e.bd(r("PSOLWIDTH", .25)), e.bd(r("PSOLHEIGHT", 4)), e.bd(r("LOFTANG1", Math.PI / 2)), e.bd(r("LOFTANG2", Math.PI / 2)), e.bd(r("LOFTMAG1", 0)), e.bd(r("LOFTMAG2", 0)), e.bs(r("LOFTPARAM", 7)), e.rc(r("LOFTNORMALS", 1)), e.bd(r("LATITUDE", 37.795)), e.bd(r("LONGITUDE", -122.394)), e.bd(r("NORTHDIRECTION", 0)), e.bl(r("TIMEZONE", -8e3)), e.rc(r("LIGHTGLYPHDISPLAY", 1)), e.rc(r("TILEMODELIGHTSYNCH", 1)), e.rc(r("DWFFRAME", 2)), e.rc(r("DGNFRAME", 0)), e.b(1), e.bs(0), e.bl(3271557121), e.rc(0), t(5, 0), t(5, 0), t(5, 0), e.rc(r("CSHADOW", 0)), e.bd(0)), n >= 13 && n < 2007 && (e.bs(0), e.bs(0), e.bs(0), e.bs(0)), n < 2007 && e.align();
	}
	let da = () => {
		if (!ca) return ua.bytes();
		ua.strTarget = void 0;
		let e = la ? la.pos : 0;
		la && (ua.appendBits(la), pi(ua, e), ua.b(1));
		let t = new P();
		return n >= 2018 && t.rl(0), t.rl(32 + ua.pos), t.appendBits(ua), t.appendBits(ca), t.align(), t.bytes();
	};
	function fa() {
		let e = new P(), t = U.size === 0;
		if (t && n < 2007) return e.bytes();
		let r = -1, i = null;
		n >= 2007 && (n >= 2018 && e.rl(0), r = e.pos, e.rl(0), i = new P(), i.utf16 = !0, e.utf16 = !0, e.strTarget = i), n >= 2004 && (e.bs(t ? 500 : an - 1), e.rc(0), e.rc(0), e.b(1));
		let a = (t, r, i, a, o = "ISM", s, c) => {
			e.bs(t), e.bs(127), e.t(o), e.t(i), e.t(r), e.b(0), e.bs(a ? 498 : 499), n >= 2004 && (e.bl(1), e.bl(s ?? 25), e.bl(c ?? 0), e.bl(0), e.bl(0));
		};
		for (let [e, t] of U) a(t.num, e, t.cpp, t.ent, t.app, t.ver, t.maint);
		if (t && a(500, "VISUALSTYLE", "AcDbVisualStyle", !1, "ObjectDBX Classes"), i) {
			e.strTarget = void 0;
			let t = i.pos;
			e.appendBits(i), pi(e, t), e.b(1), e.patchRl(r, e.pos - r);
		}
		return e.align(), e.bytes();
	}
	let pa = at.length ? ye(at) ?? void 0 : void 0;
	if (n >= 2004) return {
		data: Pt(da(), fa(), ii, sa, n === 2018 ? 2018 : n === 2007 ? 2007 : 2004, void 0, pa, r.preview),
		downgraded: it,
		skipped: i
	};
	let Z = new be(), ma = (e) => {
		Z.append(e);
	}, Q = (e) => {
		Z.push(e & 255, e >> 8 & 255);
	}, $ = (e) => {
		Q(e & 65535), Q(Math.floor(e / 65536));
	}, ha = (e, t, n) => {
		let r = Z.length;
		ma(e);
		let i = Z.length;
		return $(n.length), ma(n), Q(xe(49345, Z.view(i))), ma(t), [r, Z.length - r];
	}, ga = n === 13 ? "AC1012" : n === 14 ? "AC1014" : "AC1015";
	ma([...ga].map((e) => e.charCodeAt(0))), ma([
		0,
		0,
		0,
		0,
		0
	]), Z.push(15), Z.push(1);
	let _a = Z.length;
	$(0), Z.push(n === 13 ? 14 : n === 14 ? 17 : 23), Z.push(15), Q(30);
	let va = n <= 14 ? 5 : 6;
	$(va);
	let ya = Z.length;
	for (let e = 0; e < va; e++) Z.push(0), $(0), $(0);
	let ba = Z.length;
	Q(0), ma(vt);
	let xa = Z.length;
	r.preview?.bmp ? ma(zt(xa, [{
		type: 2,
		data: Bt(r.preview.bmp)
	}])) : (ma(yt), $(5), Z.push(0)), ma(bt);
	let [Sa, Ca] = ha(xt, St, da()), [wa, Ta] = ha(Ct, wt, fa()), Ea = Z.length, Da = [];
	for (let e of ii.sort((e, t) => e.handle - t.handle)) {
		let t = Z.length;
		Da.push({
			handle: e.handle,
			offset: t
		});
		let n = e.bytes.length, r = [], i = n;
		for (;;) {
			let e = i % 32768;
			if (i = Math.floor(i / 32768), i === 0) {
				r.push(e);
				break;
			}
			r.push(e | 32768);
		}
		for (let e of r) Q(e);
		ma(e.bytes), Q(xe(49345, Z.view(t)));
	}
	let Oa = Z.length;
	{
		let e = 0;
		for (; e < Da.length;) {
			let t = Z.length;
			Q(0);
			let n = 0, r = 0;
			for (; e < Da.length && Z.length - t < 2e3;) {
				let t = Da[e++], i = t.handle - n;
				for (;;) {
					let e = i % 128;
					if (i = Math.floor(i / 128), i === 0) {
						Z.push(e);
						break;
					}
					Z.push(e | 128);
				}
				let a = t.offset < r, o = Math.abs(t.offset - r), s = [];
				for (;;) {
					let e = o & 127;
					if (o = Math.floor(o / 128), s.push(e), o === 0) break;
				}
				s[s.length - 1] & 64 && s.push(0), a && (s[s.length - 1] |= 64);
				for (let e = 0; e < s.length; e++) Z.push(s[e] | (e < s.length - 1 ? 128 : 0));
				n = t.handle, r = t.offset;
			}
			let i = Z.length - t;
			Z.set(t, i >> 8 & 255), Z.set(t + 1, i & 255);
			let a = xe(49345, Z.view(t));
			Z.push(a >> 8 & 255, a & 255);
		}
		let t = Z.length;
		Z.push(0, 2);
		let n = xe(49345, Z.view(t));
		Z.push(n >> 8 & 255, n & 255);
	}
	let ka = Z.length - Oa, Aa = 0, ja = 0;
	n !== 14 && (Aa = Z.length, $(0), $(ii.length), $(2451545), $(0), $(Ea), Z.push(4), $(50), $(0), $(100), $(0), $(512), $(0), $(4294967295), $(0), ja = Z.length - Aa);
	let Ma = Z.length;
	Q(0), Q(1);
	let Na = Z.length - Ma, Pa = 0, Fa = 0;
	if (n > 14) {
		Pa = Z.length, ma([
			255,
			119,
			1
		]), Q(23), Q(15), $(1), $(4294967295), Q(1), Q(0), $(0), Q(23), Q(15), Q(23), Q(15);
		for (let e of [
			5,
			2195,
			5,
			2195,
			0,
			1
		]) Q(e);
		for (let e = 0; e < 5; e++) $(0);
		$(2451545), $(0), $(2451545), $(0), $(sa), $(0), Q(0), Q(1), $(0), $(0), $(0), $(1), $(0), $(0), Fa = Z.length - Pa;
	}
	{
		ma(Tt);
		let e = new P(), t = Z.length - 16;
		e.rl(0), e.bl(t);
		let r = ga;
		for (let t = 0; t < 11; t++) e.rc(t < r.length ? r.charCodeAt(t) : 0);
		e.rc(15), e.rc(n <= 14 ? 1 : 3), e.bs(3840 | (n === 13 ? 14 : n === 14 ? 17 : 23)), e.rs(30);
		let i = n === 14 ? [
			[
				0,
				Sa,
				Ca
			],
			[
				1,
				wa,
				Ta
			],
			[
				2,
				Oa,
				ka
			],
			[
				3,
				0,
				0
			],
			[
				4,
				0,
				0
			]
		] : n === 13 ? [
			[
				0,
				Sa,
				Ca
			],
			[
				1,
				wa,
				Ta
			],
			[
				2,
				Oa,
				ka
			],
			[
				3,
				Aa,
				ja
			],
			[
				4,
				Ma,
				Na
			]
		] : [
			[
				0,
				Sa,
				Ca
			],
			[
				1,
				wa,
				Ta
			],
			[
				2,
				Oa,
				ka
			],
			[
				3,
				Aa,
				ja
			],
			[
				4,
				Ma,
				Na
			],
			[
				5,
				Pa,
				Fa
			]
		];
		e.bs(i.length);
		for (let [t, n, r] of i) e.rc(t), e.bl(n), e.bl(r);
		e.bs(14);
		let a = [
			[0, sa],
			[1, x],
			[2, S],
			[3, C],
			[4, ee],
			[5, w],
			[6, ne],
			[7, T],
			[8, E],
			[9, D],
			[10, re],
			[11, O],
			[12, k],
			[13, ie]
		];
		for (let [t, n] of a) {
			let r = [], i = n;
			for (; i > 0;) r.unshift(i % 256), i = Math.floor(i / 256);
			r.length || r.push(0), e.rc(r.length), e.rc(t);
			for (let t of r) e.rc(t);
		}
		if (n === 14) for (let t = 0; t < 8; t++) e.rc(0);
		e.align();
		let o = e.bytes(), s = o.length + 2;
		o[0] = s & 255, o[1] = s >> 8 & 255, o[2] = s >> 16 & 255, o[3] = s >> 24 & 255, ma(o), Q(xe(49345, o)), ma(Et);
	}
	let Ia = Z.bytes(), La = new DataView(Ia.buffer);
	La.setUint32(_a, xa, !0), (n === 14 ? [
		[
			0,
			Sa,
			Ca
		],
		[
			1,
			wa,
			Ta
		],
		[
			2,
			Oa,
			ka
		],
		[
			3,
			0,
			0
		],
		[
			4,
			Ma,
			Na
		]
	] : n === 13 ? [
		[
			0,
			Sa,
			Ca
		],
		[
			1,
			wa,
			Ta
		],
		[
			2,
			Oa,
			ka
		],
		[
			3,
			Aa,
			ja
		],
		[
			4,
			Ma,
			Na
		]
	] : [
		[
			0,
			Sa,
			Ca
		],
		[
			1,
			wa,
			Ta
		],
		[
			2,
			Oa,
			ka
		],
		[
			3,
			Aa,
			ja
		],
		[
			4,
			Ma,
			Na
		],
		[
			5,
			Pa,
			Fa
		]
	]).forEach(([e, t, n], r) => {
		let i = ya + r * 9;
		Ia[i] = e, La.setUint32(i + 1, t, !0), La.setUint32(i + 5, n, !0);
	});
	let Ra = xe(49345, Ia, 0, ba);
	return La.setUint16(ba, Ra, !0), {
		data: Ia,
		skipped: i,
		downgraded: it
	};
};
//#endregion
export { Vt as writeDwg2018 };
