//#region ../../../node_modules/nasjidwg/dist/core/model.js
var e = () => ({
	header: {},
	layers: [{
		name: "0",
		color: {
			kind: "aci",
			index: 7
		},
		on: !0,
		frozen: !1,
		locked: !1
	}],
	linetypes: [{
		name: "Continuous",
		description: "Solid line",
		pattern: []
	}],
	textStyles: [{ name: "Standard" }],
	blocks: {},
	entities: [],
	warnings: []
}), t = [
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
], n = (e) => {
	let n = e >> 16 & 255, r = e >> 8 & 255, i = e & 255, a = 7, o = Infinity;
	for (let e = 1; e <= 255; e++) {
		let s = t[e], c = n - (s >> 16 & 255), l = r - (s >> 8 & 255), u = i - (s & 255), d = c * c + l * l + u * u;
		if (d < o && (o = d, a = e, d === 0)) break;
	}
	return a;
}, r = {
	"MC0.0": "R1.1",
	"AC1.2": "R1.2",
	"AC1.3": "R1.3",
	"AC1.40": "R1.4",
	"AC1.50": "R2.0",
	"AC2.10": "R2.10",
	"AC2.21": "R2.21",
	"AC2.22": "R2.22",
	AC1001: "R2.4",
	AC1002: "R2.5",
	AC1003: "R2.6",
	AC1004: "R9",
	AC1005: "R9",
	AC1006: "R10",
	AC1007: "R12",
	AC1008: "R12",
	AC1009: "R12",
	AC1012: "R13",
	AC1014: "R14",
	AC1015: "R2000",
	AC1018: "R2004",
	AC1021: "R2007",
	AC1024: "R2010",
	AC1027: "R2013",
	AC1032: "R2018"
}, i = (e) => ({
	"R1.1": 1,
	"R1.2": 1.2,
	"R1.3": 1.3,
	"R1.4": 1.4,
	"R2.0": 2,
	"R2.10": 2.1,
	"R2.21": 2.21,
	"R2.22": 2.22,
	"R2.4": 2.4,
	"R2.5": 2.5,
	"R2.6": 2.6,
	R9: 9,
	R10: 10,
	R12: 12,
	R13: 13,
	R14: 14,
	R2000: 2e3,
	R2004: 2004,
	R2007: 2007,
	R2010: 2010,
	R2013: 2013,
	R2018: 2018
})[e], a = (e) => {
	let t = String.fromCharCode(...e.subarray(0, 6)), n = r[t] ?? r[t.slice(0, 5)];
	if (!n) throw Error(`Not a supported DWG file (magic "${t}").`);
	return n;
}, o = (() => {
	let e = {
		0: "UTF8",
		1: "US_ASCII",
		23: "MAC_ROMAN",
		24: "BIG5",
		25: "CP949",
		26: "JOHAB",
		27: "CP866",
		31: "GB2312",
		43: "UTF16"
	};
	for (let t = 1; t <= 9; t++) e[t + 1] = `ISO8859_${t}`;
	return [
		437,
		850,
		852,
		855,
		857,
		860,
		861,
		863,
		864,
		865,
		869,
		932
	].forEach((t, n) => {
		e[11 + n] = `CP${t}`;
	}), [
		[28, 1250],
		[29, 1251],
		[30, 1252],
		[32, 1253],
		[33, 1254],
		[34, 1255],
		[35, 1256],
		[36, 1257],
		[37, 874],
		[38, 932],
		[39, 936],
		[40, 949],
		[41, 950],
		[42, 1361],
		[44, 1258]
	].forEach(([t, n]) => {
		e[t] = `ANSI_${n}`;
	}), e;
})(), s = (e) => o[e] ?? "CP" + e, c = (e) => {
	let t = new DataView(e.buffer, e.byteOffset, e.byteLength), n = s(t.getUint16(19, !0)), r = t.getUint32(21, !0);
	if (r > 16) throw Error(`Implausible DWG section count ${r}`);
	let i = [], a = 25;
	for (let n = 0; n < r; n++) i.push({
		id: e[a],
		address: t.getUint32(a + 1, !0),
		size: t.getUint32(a + 5, !0)
	}), a += 9;
	return {
		codepage: n,
		sections: i
	};
}, l = class {
	src;
	at = 0;
	constructor(e) {
		this.src = e;
	}
	get exhausted() {
		return this.at >= this.src.length;
	}
	next() {
		return this.at < this.src.length ? this.src[this.at++] : 0;
	}
	copyInto(e, t, n) {
		let r = this.src, i = Math.min(n, Math.max(0, r.length - this.at)), a = Math.min(i, Math.max(0, e.length - t));
		a > 0 && e.set(r.subarray(this.at, this.at + a), t), this.at += i;
		let o = t + i;
		i < n && o < e.length && e.fill(0, o, Math.min(t + n, e.length));
	}
	escaped() {
		let e = 0, t;
		for (; (t = this.next()) === 0 && !this.exhausted;) e += 255;
		return e + t;
	}
	count(e, t, n) {
		let r = e & t;
		return (r === 0 ? t + this.escaped() : r) + n;
	}
};
function u(e, t, n) {
	let r = new l(e), i = n, a = (e) => (r.copyInto(t, i, e), i += e, r.next()), o = r.next();
	for (o & 240 || (o = a(r.count(o, 15, 3))); !r.exhausted && i < t.length && o !== 17;) {
		let e, n;
		if (o < 16) throw Error(`R2004 unpack: reserved opcode 0x${o.toString(16)}`);
		if (o < 32) {
			e = r.count(o, 7, 2);
			let t = r.next();
			n = (t >> 2) + (r.next() << 6) + 16384 + ((o & 8) << 11), o = t;
		} else if (o < 64) {
			e = r.count(o, 31, 2);
			let t = r.next();
			n = (t >> 2) + (r.next() << 6) + 1, o = t;
		} else e = (o >> 4) - 1, n = (o >> 2 & 3 | r.next() << 2) + 1;
		if (n > i) throw Error(`R2004 unpack: back-reference ${n} reaches before the output start at ${i}`);
		let s = Math.min(i + e, t.length);
		if (n >= s - i) t.copyWithin(i, i - n, i - n + (s - i)), i = s;
		else for (; i < s; i++) t[i] = t[i - n];
		let c = o & 3;
		if (c === 0 && (o = r.next(), o & 240 || (c = r.count(o, 15, 3))), c > 0) {
			if (i + c > t.length) break;
			o = a(c);
		}
	}
	return i;
}
function d(e, t) {
	let n = new Uint8Array(t);
	return u(e, n, 0), n;
}
//#endregion
//#region ../../../node_modules/nasjidwg/dist/dwg/sections2004.js
var f = 1097010747, p = 1097007163, m = 1097093995, h = /* @__PURE__ */ new Set([
	"AC1018",
	"AC1024",
	"AC1027",
	"AC1032"
]), g = (e, t, n) => {
	let r = "";
	for (let i = t; i < t + n && i < e.length; i++) {
		let t = e[i];
		if (t === 0) break;
		r += String.fromCharCode(t);
	}
	return r;
}, _ = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength), v = (e, t) => e.getUint32(t, !0) + e.getUint32(t + 4, !0) * 4294967296, y = (e) => {
	if (e.length < 236) throw Error("DWG truncated before the R2004 file header at 0x80");
	let t = /* @__PURE__ */ new Uint8Array(108), n = 1;
	for (let r = 0; r < t.length; r++) n = Math.imul(n, 214013) + 2531011 >>> 0, t[r] = e[128 + r] ^ n >>> 16 & 255;
	if (g(t, 0, 12) !== "AcFssFcAJMB") throw Error("R2004 file header failed to decrypt (bad id string)");
	let r = _(t);
	return {
		pageMapAddress: v(r, 84) + 256,
		sectionMapPage: r.getUint32(92, !0),
		pageArraySize: r.getUint32(96, !0)
	};
}, b = (e, t, n, r) => {
	if (t < 0 || t + 20 > e.length) throw Error(`${r} at 0x${t.toString(16)} is past the end of the file`);
	let i = _(e), a = i.getUint32(t, !0);
	if (a !== n) throw Error(`${r}: page type 0x${a.toString(16)} != 0x${n.toString(16)}`);
	let o = i.getUint32(t + 4, !0), s = i.getUint32(t + 8, !0);
	if (o > 4278190080) throw Error(`${r}: absurd decompressed size ${o}`);
	let c = Math.min(t + 20 + s, e.length);
	return d(e.subarray(t + 20, c), o);
}, x = (e, t) => {
	let n = _(e), r = /* @__PURE__ */ new Map(), i = 256, a = 0;
	for (; a + 8 <= e.length;) {
		let o = n.getInt32(a, !0), s = n.getUint32(a + 4, !0);
		a += 8, o > 0 && !r.has(o) && r.set(o, {
			address: i,
			size: s
		}), o <= t && (i += s), o < 0 && a + 16 <= e.length && (a += 16);
	}
	return r;
}, S = (e) => {
	if (e.length < 20) throw Error("section map: truncated header");
	let t = _(e), n = t.getUint32(0, !0), r = [], i = 20;
	for (let a = 0; a < n && !(i + 96 > e.length); a++) {
		let n = v(t, i), a = t.getUint32(i + 8, !0), o = t.getUint32(i + 12, !0), s = t.getUint32(i + 20, !0), c = g(e, i + 32, 64);
		if (i += 96, a > 1048576) break;
		let l = [], u = a;
		for (let n = 0; n < u && i + 16 <= e.length; n++) {
			let e = t.getInt32(i, !0), n = v(t, i + 8);
			if (i += 16, e < 0) {
				u++;
				continue;
			}
			l.push({
				pageNumber: e,
				offset: n
			});
		}
		r.push({
			name: c,
			size: n,
			pageDecompSize: o,
			compression: s,
			pages: l
		});
	}
	return r;
}, C = (e, t, n) => {
	let r = t.size;
	for (let e of t.pages) r = Math.max(r, e.offset + t.pageDecompSize);
	if (r <= 0 || r > 788529152) return;
	let i = _(e), a = new Uint8Array(r);
	for (let o of t.pages) {
		let s = n.get(o.pageNumber);
		if (!s || s.address + 32 > e.length) continue;
		let c = s.address, l = (m ^ c) >>> 0, d = (i.getUint32(c + 8, !0) ^ l) >>> 0, f = (i.getUint32(c + 12, !0) ^ l) >>> 0, p = (i.getUint32(c + 16, !0) ^ l) >>> 0;
		if (!(p >= r)) {
			if (t.compression === 2) {
				let t = e.subarray(c + 32, Math.min(c + 32 + d, e.length));
				try {
					u(t, a, p);
				} catch {}
			} else {
				let n = Math.min(t.size - p, f, e.length - (c + 32));
				n > 0 && a.set(e.subarray(c + 32, c + 32 + n), p);
			}
		}
	}
	return a.subarray(0, Math.min(t.size, r));
};
function w(e) {
	let t = g(e, 0, 6);
	if (!h.has(t)) throw Error(`not an R2004-family DWG (version "${t}")`);
	let n = y(e), r = x(b(e, n.pageMapAddress, f, "section page map"), n.pageArraySize), i = r.get(n.sectionMapPage);
	if (!i) throw Error(`section map page ${n.sectionMapPage} missing from the page map`);
	let a = S(b(e, i.address, p, "section map")), o = /* @__PURE__ */ new Map();
	for (let t of a) {
		if (!t.name || t.pages.length === 0 || o.has(t.name)) continue;
		let n = C(e, t, r);
		n && o.set(t.name, n);
	}
	return o;
}
//#endregion
//#region ../../../node_modules/nasjidwg/dist/dwg/sections2007.js
var ee = (e) => e + 7 & -8, T = (e, t) => {
	let n = e.getBigUint64(t, !0);
	if (n > BigInt(2 ** 53 - 1)) throw Error(`R2007: 64-bit value at ${t} out of sane range`);
	return Number(n);
}, E = (e, t) => {
	let n = e.getBigInt64(t, !0);
	if (n > BigInt(2 ** 53 - 1) || n < -BigInt(2 ** 53 - 1)) throw Error(`R2007: 64-bit value at ${t} out of sane range`);
	return Number(n);
}, D = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function te(e, t, n) {
	if (t <= 0 || t * n > e.length) throw Error(`R2007: RS page too small for ${t} block(s)`);
	let r = new Uint8Array(t * n), i = 0;
	for (let a = 0; a < t; a++) for (let o = 0, s = a; o < n; o++, s += t) r[i++] = e[s];
	return r;
}
var ne = (/* @__PURE__ */ ".0.10.210.0123.40123.512340.6512340.01234567.801234567.9123456780.a9123456780.89ab01234567.c89ab01234567.d9abc123456780.ed9abc123456780.89abcdef01234567.9abcdefg801234567.h9abcdefg123456780.ihg89abcdef01234567.ghij89abcdef01234567.kghij89abcdef01234567.lkghij89abcdef01234567.mlkghij89abcdef01234567.ghijklmn89abcdef01234567.hijklmnog89abcdef01234567.phijklmnog89abcdef01234567.qphijklmnog89abcdef01234567.opqrghijklmn89abcdef01234567.sopqrghijklmn89abcdef01234567.tsopqrghijklmn89abcdef01234567.uqrstijklmnopabcdefgh2345678910".split(".")).map((e) => Uint8Array.from([...e], (e) => parseInt(e, 32)));
function re(e, t, n, r, i) {
	for (; i >= 32;) {
		for (let i = 24; i >= 0; i -= 8) for (let a = 0; a < 8; a++) e[t++] = n[r + i + a];
		r += 32, i -= 32;
	}
	let a = ne[i];
	for (let o = 0; o < i; o++) e[t + o] = n[r + a[o]];
}
function O(e, t, n, r, i) {
	let a = Math.min(i, r.length);
	if (a < 2) throw Error("R2007: compressed stream too short");
	let o = 0, s = t, c = 0, l = 0, u = 0, d = () => {
		if (o >= a) throw Error("R2007: compressed stream ran out");
		return r[o++];
	}, f = () => {
		if (u = c + 8, u !== 23) return;
		let e = d();
		if (u += e, e === 255) do
			e = d() | d() << 8, u += e;
		while (e === 65535);
	}, p = () => {
		if (c < 32) {
			let e = c < 16;
			u = (c & 15) + (e ? 19 : 3);
			let t = d(), n = d();
			e && (u += n >> 3 & 16), l = t + ((n & (e ? 120 : 248)) << 5) + 1, c = n;
		} else c < 48 ? (l = d() | d() << 8, u = c & 7, c & 8 ? (l++, u += d() << 3, c = d(), u += ((c & 248) << 8) + 256) : (c = d(), u += c & 248)) : (u = c >> 4, l = c & 15, c = d(), l += ((c & 248) << 1) + 1);
	};
	if (c = d(), (c & 240) == 32 && (o += 2, u = d() & 7, u === 0)) throw Error("R2007: zero-length stream header");
	for (; o < a;) {
		if (u === 0 && f(), s + u > n || o + u > a) throw Error("R2007: literal run overflows buffer");
		if (re(e, s, r, o, u), s += u, o += u, u = 0, o >= a) return;
		for (c = d(), p();;) {
			if (s + u > n) throw Error("R2007: match overflows buffer");
			if (l > s - t) throw Error("R2007: match offset before stream start");
			for (let t = 0, n = s - l; t < u; t++) e[s + t] = e[n + t];
			if (s += u, u = c & 7, u !== 0 || o >= a || (c = d(), !(c >> 4))) break;
			c >> 4 == 15 && (c &= 15), p();
		}
	}
}
var k = 1152;
function A(e, t, n, r, i) {
	if (n <= 0 || n >= e.length || r <= 0 || r >= e.length || i <= 0 || i > 1048576) throw Error(`R2007: invalid system page (comp ${n}, uncomp ${r}, x${i})`);
	let a = Math.ceil(ee(n) * i / 239), o = ee(a * 255);
	if (t < 0 || t + o > e.length) throw Error(`R2007: system page at ${t} (+${o}) outside the file`);
	let s = te(e.subarray(t, t + o), a, 239);
	if (n >= r) return s.slice(0, r);
	let c = new Uint8Array(r + o);
	return O(c, 0, c.length, s, Math.min(s.length, n)), c.subarray(0, r);
}
var j = (e) => Math.ceil(ee(e) / 251) * 255 + 31 & -32, M = 128, N = 272;
function P(e) {
	if (e.length < 1112) throw Error("R2007: file too short for the encoded file header");
	let t = te(e.subarray(M, 1112), 3, 239), n = D(t).getInt32(24, !0), r;
	n > 0 ? (r = new Uint8Array(N), O(r, 0, N, t.subarray(32), Math.min(n, t.length - 32))) : r = t.slice(32, 304);
	let i = D(r);
	return {
		pagesMapCorrection: T(i, 24),
		pagesMapOffset: T(i, 56),
		pagesMapSizeComp: T(i, 80),
		pagesMapSizeUncomp: T(i, 88),
		sectionsMapSizeComp: T(i, 176),
		sectionsMapId: E(i, 192),
		sectionsMapSizeUncomp: T(i, 200),
		sectionsMapCorrection: T(i, 216)
	};
}
function F(e, t) {
	let n = A(e, k + t.pagesMapOffset, t.pagesMapSizeComp, t.pagesMapSizeUncomp, t.pagesMapCorrection);
	if (n.length % 16 != 0) throw Error(`R2007: pages map size ${n.length} not a whole number of entries`);
	let r = D(n), i = /* @__PURE__ */ new Map(), a = k;
	for (let e = 0; e < n.length; e += 16) {
		let t = T(r, e), n = E(r, e + 8);
		i.has(n) || i.set(n, {
			offset: a,
			size: t
		}), a += t;
	}
	return i;
}
function ie(e, t, n) {
	let r = n.get(t.sectionsMapId);
	if (!r) throw Error(`R2007: sections map page ${t.sectionsMapId} missing from pages map`);
	let i = A(e, r.offset, t.sectionsMapSizeComp, t.sectionsMapSizeUncomp, t.sectionsMapCorrection), a = D(i), o = [], s = 0;
	for (; s < i.length;) {
		if (s + 64 > i.length) throw Error("R2007: truncated section map entry");
		let t = T(a, s), n = T(a, s + 32), r = T(a, s + 56);
		if (s += 64, t > 10 * e.length || n >= 48) throw Error("R2007: implausible section map entry");
		let c = n + (n & 1);
		s + c > i.length && (c = i.length - s & -2);
		let l = "";
		for (let e = s; e + 2 <= s + c; e += 2) {
			let t = i[e] | i[e + 1] << 8;
			if (t === 0) break;
			l += String.fromCharCode(t & 255);
		}
		if (s += c, r <= 0 || r > 983040) continue;
		let u = [];
		for (let e = 0; e < r && !(s + 56 > i.length); e++) u.push({
			targetOffset: T(a, s),
			pageId: E(a, s + 16),
			uncompSize: T(a, s + 24),
			compSize: T(a, s + 32)
		}), s += 56;
		l && o.push({
			name: l,
			dataSize: t,
			pages: u
		});
	}
	return o;
}
function ae(e, t, n) {
	let r = new Uint8Array(t.dataSize);
	for (let i of t.pages) {
		let a = n.get(i.pageId);
		if (!a) throw Error(`R2007: section '${t.name}' references unknown page ${i.pageId}`);
		if (i.targetOffset + i.uncompSize > r.length) throw Error(`R2007: section '${t.name}' page lands outside its data`);
		if (i.compSize !== i.uncompSize || a.size === j(i.compSize)) {
			if (a.offset + a.size > e.length) throw Error(`R2007: page ${i.pageId} outside the file`);
			let t = Math.ceil(ee(i.compSize) / 251), n = te(e.subarray(a.offset, a.offset + a.size), t, 251);
			i.compSize < i.uncompSize ? O(r, i.targetOffset, r.length, n, Math.min(n.length, i.compSize)) : r.set(n.subarray(0, i.uncompSize), i.targetOffset);
		} else {
			if (a.offset + i.uncompSize > e.length) throw Error(`R2007: page ${i.pageId} outside the file`);
			r.set(e.subarray(a.offset, a.offset + i.uncompSize), i.targetOffset);
		}
	}
	return r;
}
function oe(e) {
	if (e.length < 6 || String.fromCharCode(...e.subarray(0, 6)) !== "AC1021") throw Error("R2007: not an AC1021 (2007-2009) DWG");
	let t = P(e), n = F(e, t), r = ie(e, t, n), i = /* @__PURE__ */ new Map();
	for (let t of r) if (t.pages.length !== 0) try {
		i.set(t.name, ae(e, t, n));
	} catch {}
	return i;
}
//#endregion
//#region ../../../node_modules/nasjidwg/dist/dwg/objectmap.js
var se = (e) => {
	let t = Math.max(1024, e.length >> 2), n = new Float64Array(t), r = new Float64Array(t), i = 0, a = () => {
		t *= 2;
		let e = new Float64Array(t);
		e.set(n), n = e;
		let i = new Float64Array(t);
		i.set(r), r = i;
	}, o = 0, s = (t) => {
		let n = 0, r = 0;
		for (;;) {
			if (o >= t) throw RangeError("object map truncated");
			let i = e[o++];
			if (n += (i & 127) * 2 ** r, !(i & 128)) return n;
			r += 7;
		}
	}, c = (t) => {
		let n = 0, r = 0;
		for (;;) {
			if (o >= t) throw RangeError("object map truncated");
			let i = e[o++];
			if (i & 128) n += (i & 127) * 2 ** r, r += 7;
			else {
				let e = !!(i & 64);
				return i &= 63, n += i * 2 ** r, e ? -n : n;
			}
		}
	};
	for (; o + 2 <= e.length;) {
		let l = e[o] << 8 | e[o + 1];
		if (l <= 2) break;
		let u = Math.min(o + l, e.length);
		o += 2;
		let d = 0, f = 0;
		for (; o < u;) d += s(u), f += c(u), i === t && a(), n[i] = d, r[i] = f, i++;
		o = u + 2;
	}
	return {
		count: i,
		handles: n,
		offsets: r
	};
}, I = {};
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
	I[e] = [
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
	I[e] = [t, t + 1];
}), I[1569] = [65152], I[1600] = [
	1600,
	1600,
	1600,
	1600
];
var ce = {
	1570: [65269, 65270],
	1571: [65271, 65272],
	1573: [65273, 65274],
	1575: [65275, 65276]
}, le = (e) => e >= 1611 && e <= 1631 || e === 1648, ue = (e) => {
	if (!/[ء-ي]/.test(e)) return e;
	let t = Array.from(String(e)), n = [], r = !1;
	for (let e = 0; e < t.length; e++) {
		let i = t[e].codePointAt(0);
		if (le(i)) {
			n.push(t[e]);
			continue;
		}
		let a = I[i];
		if (!a) {
			n.push(t[e]), r = !1;
			continue;
		}
		if (i === 1604 && e + 1 < t.length) {
			let i = ce[t[e + 1].codePointAt(0)];
			if (i) {
				n.push(String.fromCharCode(r ? i[1] : i[0])), e++, r = !1;
				continue;
			}
		}
		let o = a.length === 4, s = !1;
		for (let n = e + 1; n < t.length; n++) {
			let e = t[n].codePointAt(0);
			if (le(e)) continue;
			let r = I[e];
			s = !!(r && r.length >= 2);
			break;
		}
		let c = o && s ? r ? 3 : 2 : +!!r;
		n.push(String.fromCharCode(a[Math.min(c, a.length - 1)])), r = o && s;
	}
	return n.join("");
}, de = {};
for (let e of Object.keys(I)) {
	let t = Number(e);
	for (let e of I[t]) e !== 1600 && (de[e] = String.fromCharCode(t));
}
for (let e of Object.keys(ce)) {
	let t = Number(e);
	for (let e of ce[t]) de[e] = "ل" + String.fromCharCode(t);
}
var fe = (e) => /[ﭐ-ﻼ]/.test(e) ? e.replace(/[ﭐ-ﻼ]/g, (e) => de[e.charCodeAt(0)] ?? e) : e, pe = {
	"(": ")",
	")": "(",
	"[": "]",
	"]": "[",
	"{": "}",
	"}": "{",
	"<": ">",
	">": "<"
}, me = (e) => e >= 1536 && e <= 1791 || e >= 64336 && e <= 65276 ? "R" : e >= 65 && e <= 90 || e >= 97 && e <= 122 ? "L" : null, he = (e, t) => {
	if (!/[()[\]{}<>]/.test(e)) return e;
	let n = null;
	for (let t of e) if (n = me(t.codePointAt(0)), n) break;
	if (n !== "R") return e;
	let r = t ? ")]}>" : "([{<", i = t ? "([{<" : ")]}>", a = Array.from(e), o = [];
	for (let e = 0; e < a.length; e++) {
		if (r.indexOf(a[e]) >= 0) {
			o.push(e);
			continue;
		}
		if (i.indexOf(a[e]) >= 0 && o.length) {
			let t = o.pop(), n = !1;
			for (let r = t + 1; r < e && !n; r++) n = me(a[r].codePointAt(0)) === "R";
			n && (a[t] = pe[a[t]], a[e] = pe[a[e]]);
		}
	}
	return a.join("");
}, ge = (e, t = !1) => e.split("\n").map((e) => he(e, t)).join("\n"), L = (e) => /[ﭐ-ﻼ]/.test(e) ? ge(fe(e), !0) : e, _e = (e) => /[֐-ࣿיִ-ﻼ]/.test(e), ve = {
	CP932: "pj4,9hc;1,1;1,1;1,14wa;1,2;1,-14pf;1,14pr;1,1;1,4;1,-u;1,-14rq;1,1;1,-9go;1,1ea4;1,-1eag;1,1eae;1,4l;1,-4k;1,-14qq;1,1;1,-2p;1,1;1,-4b;1,63e;1,-63c;1,1;1,1;1,6t;1,-3c7;1,-5;1,181r;1,-1eb7;1,9fk;1,-35y;1,183q;1,-183a;1,-1;1,-d;1,1;1,3;1,1;1,1817;1,1;1,-14vp;1,1;1,14x2;1,2;1,u;1,2;1,-14yd;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,14vu;1,-17nd;1,-6ld;1,12;2,w;1,1e7a;1,-17lp;1,17lo;1,2;1,-17lk;1,1;1,-21;1,m;1,su;1,-2;1,-7f4;1,682;1,1;1,5s;1,180y;1,-69;1,-1e8y;1,1;1,1e8y;1,-2;1,3;1,4;1,m;1,-1e9l;1,7dr;1,-1;1,-1m;1,4;1,-1;1,-7;1,-1;1,-11;1,-1;1,j;1,-1;1,b;1,-1;1,-135;1,34n;1,-2v4;1,-2;1,1;1,2;1,2v4;c,-2rv;1,3;1,3f;1,1;1,-5;1,1;1,-2h;1,-1;9,-2;1,1;1,-6m4;1,6jq;1,2;1,18;1,3;c,t;1,3p;1,31;1,-7k;1,5;1,2i;1,-f;1,o;1,1;1,-29;1,z;1,-w;1,o;1,-a;1,1;8,-75;1,-6z;1,18f;1,-2;1,-3;1,-18q;1,1;1,-67f;5,7cp;2b,16w1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;8,8;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;8,7;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;5,-14wp;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;27,e;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;9,-8yt;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;9,8;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;2y,1z;1,1;1,1;1,1;1,1;1,1;1,-k;1,l;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;g,1;1,1;1,1;1,1;1,1;1,1;1,s;1,-r;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;e,6gh;1,2;1,a;1,4;1,8;1,-4;1,8;1,g;1,-8;1,g;1,8;1,-1n;1,2;1,c;1,4;1,8;1,-4;1,c;1,g;1,-8;1,g;1,g;1,-17;1,f;1,-7;1,f;1,8;1,-y;1,j;1,-b;1,j;1,a;rl,862;1,1a2;1,z1;1,bwc;1,-cxr;1,2fv;1,el;1,-1te;1,ap8;1,-2b1;1,-9l;1,-1qk;1,-52e;1,mv;1,210;1,-1mg;1,60p;1,-cg;1,4zz;1,-a5e;1,-3fw;1,2uy;1,-mo;1,-1cm;1,-cr;1,8tn;1,3nd;1,-5g2;1,2k;1,5w0;1,-bco;1,58p;1,2e0;1,-8xa;1,mk;1,us;1,pa;1,c1;1,8zj;1,cm;1,-9j2;1,-4tm;1,11;1,1v;1,28;1,4s;1,1bd;1,g5;1,4d;1,19;1,eg;1,ye;1,1c;1,2p;1,wz;1,ky;1,1it;1,wl;1,x;1,wb;1,qa;1,1u;1,k4;1,nf;1,ut;1,in;1,11v;1,11;1,-c3j;1,-x2;1,g;1,1tm;1,82b;1,367;1,-4pe;1,-8hb;1,25t;1,4a9;1,6mu;1,-4cm;1,1rq;1,-4d;1,52c;1,-esu;1,fj;1,99;1,10;1,e7;1,m3;1,10a;1,bfh;1,-8hz;1,3qx;1,uh;1w,3ed;1,e;1,1c;1,9n;1,-df4;1,-o;1,1hw;1,47c;1,2y6;1,35x;1,1eu;1,-dbt;1,elp;1,-6ua;1,-8tl;1,8ea;1,1ux;1,-3x2;1,-4r2;1,-7o;1,4d5;1,54t;1,4kh;1,-d3q;1,-18c;1,531;1,1h2;1,6gj;1,-ci5;1,-1ip;1,cze;1,1bb;1,-3vn;1,4al;1,-dnv;1,d1;1,12y;1,u9;1,1bj;1,5v;1,7l;1,tw;1,57;1,1i;1,1f6;1,h9;1,p2;1,5wm;1,-477;1,12i;1,ed;1,1ot;1,-7cr;1,1kp;1,7z;1,6wr;1,-ba7;1,8d7;1,i1;1,1m0;1,-8pw;1,-4bl;1,-fb;2,13g;1,7y;1,7o;1,hc;1,n6;1,8i;1,ox;1,23;1,1qj;1,gl;1,ai;1,3q;1,1x;1,3g;1,a2;1,24i;1,vp;1,2j;1,jq;1,24p;1,e3;1,24g;1,-dki;1,2mr;1,1b2;1,1qj;1,-6y4;1,1f9;1,1j;1,17f;1,2k;1,kg;1,n2;1,ts;1,71;1,3x;1,1jr;1,2eu;1,1w5;1,3x2;1,-u;1,c6;1,-d2b;1,35h;1,4it;1,-9yv;1,287;1,12j;1,6c0;1,-500;1,1yj;1,-748;1,bl;1,ou;1,2k1;1,2ps;1,2ee;1,5us;1,-elk;1,zv;1,-tk;1,2v;1,-o;1,2s;1,-1a;1,ml;1,9b;1,ey;1,li;1,c2;1,6t;1,17;1,5ww;1,-3t6;1,7p;1,q;1,pi;1,9z;1,qg;1,nr;1,157;1,1d;1,3i;1,97;1,1ey;1,16;1,15;1,37;1,3c;1,-s;1,pf;1,ng;1,-adl;1,arj;1,n2;1,2w;1,1cg;1,-39w;1,-ati;1,2lg;1,10p;1,37s;1,ki;1,2i2;1,60;1,u9;1,14y;1,1z9;1,ge;1,5e;1,-etm;1,27;1,bm1;1,-a2t;1,a4;1,3k;1,181;1,6o;1,1r;1,2y;1,-1e;1,a6;1,1u;1,5a;1,h5;1w,ao8;1,-afv;1,ga;1,xz;1,l5;1,yk;1,8q;1,1db;1,10w;1,11w;1,2oi;1,77;1,-1yp;1,-bl8;1,5p;1,194;1,-v7;1,1ds;1,9v;1,uq;1,1lm;1,tp;1,25a;1,2f2;1,p8;1,ez;1,1th;1,1e9;1,-8y4;1,8qk;1,-3pr;1,-9bq;1,38c;1,633;1,280;1,-cjv;1,sk;1,-hv;1,24v;1,su;1,d4;1,oz;1,-4;1,oz;1,1iv;1,11k;1,c1;1,2zz;1,1k;1,pl;1,bc;1,dm;1,xi;1,6p;1,5x;1,-bur;1,99;1,2iy;1,98w;1,1;1,-aer;1,4n9;1,-3cl;2,2c;1,-cp;1,a53;1,-8tq;1,-5pp;1,mj;1,24z;1,ho;1,21b;1,5o;1,5m;1,496;1,xh;1,184;1,-cvk;1,ffp;1,-e9v;1,46d;1,7z;1,8y2;1,-9cq;1,-4i6;1,86f;1,1yn;1,2lm;1,c0;1,-c35;1,dzh;1,-ah2;1,5b7;1,8c;1,-1ho;1,-8f1;1,9ml;1,-2qn;1,-7l4;1,79;1,f1;1,20i;1,-1xk;1,5q;1,f;1,26s;1,-1nl;1,i8;1,cc;1,bq;1,c;1,1v;1,if;1,7;1,fe;1,3g;1,1w;1,2j;1,f1;1,av;1,hb;1,3m;1,4n;1,g4;1,l;1,78;1,jv;1,39;1,-2a;1,12j;1,2w;1,cr;1,14;1,s4;1,4i;1,3k;1,co;1,99;1,56;1,4t;1,cp;1,8o;1,179;1,7t;1,db;1,rd;1,r1;1,8y;1,-2;1,h;1,5f;1,a6;1,9h;1,-4k0;1,-a8w;1,16b;1,1ot;1,7o;1,4bh;1,ir;1,6o;1,-58z;1,6yq;1,2lc;1,1x2;1,9c;1,1v;1,4;1,-ehj;1,d;1,v7;1,ff;1,5o;1,b6;1,99;1,ci;1,57;1,5o;1,ak;1,36;1,9a;1,te;1,ng;1,-9v;1,b;1,8t;1,bw;1,-7;1w,bf;1,-2en;1,2ol;1,2a;1,2u;1,1s2;1,qx;1,-5wl;1,61p;1,lc;1,-5s3;1,89e;1,3t;1,ik;1,5f;1,9h;1,29;1,1xh;1,8c;1,8e;1,-f5o;1,e5;1,3n;1,1oz;1,eh;1,1ar;1,29;1,h8;1,18u;1,1gm;1,kx;1,qe;1,19e;1,1n6;1,jl;1,50;1,-7us;1,6ce;1,3x2;1,-dcn;1,-6;1,bs;1,3op;1,ec;1,6c8;1,-3m1;1,-3aq;1,axk;1,-evt;1,1m6;1,7eg;1,112;1,1x2;1,-d0u;1,19;1,3m;1,22;1,xl;1,32;1,1h2;1,o5;1,7m;1,10s;2,do;1,zp;1,1c;1,35;1,ph;1,p7;1,19v;1,1k;1,2i;1,eq;1,-s;1,2w;1,-4n3;1,2gk;1,-61s;1,1oq;1,bn;1,yy;1,e;1,1l;1,26f;1,4sa;1,rb;1,q4;1,10b;1,-73r;1,23p;1,6no;1,-f5e;1,3;1,1;1,6n;1,5;1,8h;1,3a;1,88f;1,-879;1,3p;1,9q;1,-1f;1,2m;1,30;1,ch;1,k7;1,v2;1,gm;1,j;1,6d;1,x;1,t;1,j6;1,fu;1,z6;1,hi;1,16p;1,17;1,zm;1,1s9;1,d;1,77;1,na;1,2ax;1,kq;1,ta;1,9k;1,77;1,-ewa;1,kt;1,21c;1,21g;1,ks;1,-2lp;1,242;1,hv;1,1zo;1,-27t;1,3zl;1,-8n0;1,f3;1,v7;1,1br;1,ai0;1,-8zm;1,133;1,q;1,1rr;1,11p;1,1o;1,b2;1,hr;1,z3;1,7n;1,xf;1,68;1,d6;1,wo;1,e8;1,-c6q;1,cbl;1,-dgj;1,d5;1,q7;1,-4r;1,68t;1,5b;1,ur;1,265;1,2bt;1,26v;1,2;1,a;1,-eaj;1,337;1,7d0;1,-9m6;1,79m;1,-8as;1,28t;1,ad0;1,18e;1,-eab;1,5nt;1,7po;1,-al2;1,-9;1w,1g0;1,4jr;1,-2rw;1,8gx;1,-1lf;1,-43b;1,-1sw;1,7b2;1,-552;1,-417;1,4ex;1,-4db;1,8ij;1,-cqi;1,89;1,9sg;1,vc;1,-227;1,2zt;1,es;1,-c57;1,ahu;1,-30n;1,-873;1,70;1,9f;1,-5p;1,sv;1,d6;1,5od;1,-5lr;1,cm;1,175;1,y;1,6p;1,75;1,-f;1,1u;1,eh;1,3s;1,8i;1,77;1,cz;1,15d;1,1g3;1,yf;1,ji;1,29;1,25;1,4y;1,80;1,pv;1,1o;1,oz;1,mz;1,2j;1,77;1,pj;1,1st;1,12t;1,-5av;1,2l2;1,2e2;2,-eht;1,32w;1,h0;1,27x;1,7o9;1,-95k;1,-4og;1,58v;1,9m;1,ka;1,274;1,kc;1,25s;1,df;1,-6xn;1,-4r6;1,8z;1,-j;1,1r;1,7r;1,58;1,17;1,n8;1,a0;1,6u;1,jr;1,tq;1,jc;1,1y;1,6z;1,3j;1,14a;1,7h;1,1n8;1,1b;1,3m;1,yu;1,2j;1,zu;1,-19p;1,1wd;1,1r6;1,b2;1,cp;1,ds;1,b5;1,lu;1,lh;1,d7;1,ce;1,v9;1,-f91;1,gs;1,k;1,24o;1,4r;1,2yd;1,39;1,z8;1,3e;1,1tx;1,z8;1,1jd;1,6y;1,28m;1,-e82;1,cd;1,rd;1,48;1,hq;1,k7;1,b7;1,i5;1,56;1,3g;1,lt;1,lp;1,h6;1,1bb;1,vu;1,1yy;1,2cq;1,-1lf;1,1s;1,lr;1,gu;1,u1;1,o1;1,un;1,wg;1,bk;1,1bg;1,-fwf;1,-2;1,3f;1,u3;1,75;1,-b;1,169;1,125;1,l;1,72;1,1l4;1,dj;1,1xo;1,tj;1,3kt;1,6;1,5v;1,17d;1,-d9u;1,faj;1,-f8l;1,60;1,1f;1,2y;1,-3;1,8j;1,z;1,8j;1,q;1,1x;1,4c;1,21;1,1a;1w,-3;1,aj;1,co;1,29;1,d7;1,d3;1,9;1,1e;1,gm;1,2;1,g;1,3l;1,b;1,n;1,t;1,2p;1,8q;1,6y;1,97;1,1t;1,5r;1,b8;1,5j;1,1t;1,4x;1,3d;1,50;1,3a;1,8k;1,ic;1,5n;1,1r;1,5i;1,32;1,1at;1,9h;1,dh;1,cz;1,ip;1,11;1,j;1,1y;1,2b;1,h0;1,-i;1,4s;1,2;1,4j;1,1n;1,4b;1,88;1,ze;1,l;1,je;1,av;1,2i;1,r2;1,4r;1,70;1,-56a;1,5a5;1,iw;1,4p;2,c8;1,b8;1,8v;1,gz;1,-esg;1,28;1,98;1,h;1,y5;1,202;1,2jt;1,5my;1,l1;1,316;1,-fam;1,6o;1,en;1,j7;1,6yr;1,4l3;1,2cp;1,aa;1,-8lq;1,-u3;1,3mv;1,-2fz;1,-45w;1,65;1,bf2;1,-7v1;1,5pd;1,-76g;1,8tb;1,-egp;1,1ly;1,38;1,9m;1,bg;1,172;1,9r;1,ug;1,-9;1,fn;1,3c;1,11i;1,1jy;1,1gl;1,110;1,4wk;1,-f53;1,51;1,vt;1,8t;1,1nt;1,3b;1,8;1,1zh;1,wu;1,1ju;1,pb;1,3m6;1,1ty;1,-247;1,-9sf;1,1g7;1,w4;1,-3na;1,-9;1,69;1,48j;1,-3lj;1,ph;1,9p;1,dx;1,qh;1,kk;1,9g;1,ws;1,mu;1,id;1,hh;1,6kq;1,-66f;1,13p;1,h;1,93;1,-3xb;1,4o2;1,1bg;1,yt;1,18o;1,1hu;1,-dh3;1,xw;1,36w;1,4re;1,2lz;1,-bn1;1,13i;1,cfc;1,-c8g;1,3f4;1,4kq;1,-8oy;1,1ng;1,-102;1,6ft;1,7dx;1,-fj2;1,ku;1,g1;1,33n;1,dm;1,6k;1,69;1,3nz;1,5u;1,cs;1,4ct;1,-8gj;1,a4x;1,-6es;1,-7xc;1,-b3;1,4t;1w,1wo;1,1ef;1,c8;1,1k;1,g7;1,wd;1,54f;1,3e0;1,-6dd;1,7d2;1,-b62;1,9fe;1,1ph;1,-7ak;1,-38t;1,-4sp;1,i7;1,mi;1,1pr;1,vr;1,q2;1,5t;1,l8;1,1vr;1,dg;1,9l;1,19w;1,kr;1,1lf;1,z2;1,9k;1,wt;1,1i0;1,-a5g;1,73;1,yo;1,-5o6;1,-1;1,2u;1,1x;1,jf;1,ce;1,-6;1,dt;1,6w;1,eo;1,68;1,-2;1,1i;1,9d;1,71;1,c5;1,15;1,bw;1,1y;1,kq;1,fc;1,-1xv;1,21f;1,e;1,17;1,c5;1,qt;2,p;1,44;1,1fa;1,16s;1,3c;1,mv;1,x;1,i;1,on;1,2o;1,6p;1,1ib;1,5k;1,b;1,-3;1,12;1,2q;1,d5;1,l;1,1yo;1,fk;1,-8zx;1,-5pg;1,4x;1,29;1,cj;1,1zb;1,4j;1,11q;1,c9;1,n5;1,yn;1,q2;1,-eo;1,137;1,hr;1,7r;1,kt;1,3d;1,1ci;1,13;1,c7;1,iy;1,26i;1,-6z2;1,9wv;1,-cj4;1,8qx;1,3ir;1,-6r5;1,3y6;1,-a5n;1,bq6;1,-eeg;1,166;1,sm;1,8q;1,bc;1,63;1,yt;1,2ra;1,3r;1,1bs;1,4ks;1,-9qj;1,869;1,-1sw;1,-8ku;1,4n6;1,59l;1,-7jw;1,82x;1,-1f0;1,s0;1,-9kl;1,223;1,1gk;1,8am;1,-7uy;1,2c2;1,1jk;1,rd;1,ku;1,26w;1,q5;1,bo;1,-1wn;1,1yb;1,-cqz;1,kb;1,1ts;1,26x;1,1t5;1,c9;1,653;1,3g;1,9v;1,-37q;1,-7qb;1,of;1,co;1,-3pa;1,13v;1,1iq;1,1c3;1,yu;1,ux;1,1gf;1,6v;1,18u;1,1fh;1,2ew;1,q7;1,1ms;1,-ebo;1,jp;1,43;1,1hx;1,1hl;1,1bl;1,3ub;1,504;1,-co6;1,-lo;1,4a;1w,1f3;1,4a;1,bx;1,-2r4;1,3df;1,e5;1,20k;1,2ha;1,b;1,on;1,7f;1,at;1,ez;1,1e;1,hd;1,qe;1,8c;1,f2;1,kk;1,57;1,76;1,7u;1,x;1,122;1,-10q;1,-d7g;1,3z;1,dy;1,e4;1,2fm;1,hn;1,152;1,vh;1,cq;1,120;1,24j;1,3vr;1,52;1,-cdr;1,11h;1,iu;1,3ki;1,2a4;1,y9;1,-b7;1,-74t;1,4yp;1,-691;1,aqh;1,1i5;1,-co6;1,2lt;1,1t6;1,3gn;1,mv;1,1fd;1,4pv;1,-e9l;1,2qs;1,18i;1,oz;1,ey;1,h6;2,4j;1,5q;1,1i2;1,17a;1,-65v;1,9zo;1,7m;1,1a7;1,-duo;1,1j;1,36r;1,up;1,20;1,1fl;1,-31g;1,658;1,bk;1,-4u2;1,62f;1,20;1,zl;1,-b4f;1,8g;1,13u;1,10c;1,75;1,5h;1,9zj;1,ow;1,-drh;1,2w;1,ce;1,1v;1,13;1,4l;1,70;1,2m;1,-l;1,6e;1,nl;1,2e;1,3i;1,ah;1,29;1,9;1,2;1,9;1,h6;1,6;1,2e;1,40;1,lr;1,5;1,2f;1,4x;1,-l;1,i8;1,5;1,x;1,21;1,7c;1,84;1,al;1,m;1,hz;1,5o;1,3l;1,27;1,kk;1,-m;1,1t;1,v4;1,8q;1,9o;1,4k;1,2s;1,3v;1,6o;1,1d;1,ba;1,42;1,nx;1,n4;1,51;1,5a;1,lw;1,46;1,8c;1,t;1,o;1,v;1,dq;1,3h;1,xy;1,5e;1,7s;1,4a;1,hw;1,70;1,-ej2;1,-2;1,m;1,1l;1,n4;1,61;1,126;1,2u;1,48;1,gm;1,ly;1,i5;1,u1;1,gz;1,-b;1,166;1,12q;1,jh;1,z4;1,21h;1,1bu;1,18m;1,a0;1,-c1b;1,cj;1,cui;1w,-aoh;1,17k;1,i1;1,193;1,2g7;1,f7;1,e3;1,1h0;1,2yh;1,-3gq;1,1ng;1,-a5y;1,-2kj;1,4p;1,-18;1,11u;1,109;1,cd;1,c;1,re;1,az;1,dd;1,ht;1,4b;1,ir;1,4t;1,rh;1,3d;1,1fm;1,3q;1,9y;1,fz;1,3s;1,nh;1,xc;1,5o;1,l7;1,sg;1,40;1,vl;1,6o;1,47;1,bv;1,10q;1,-ea5;1,7;1,n6;1,19u;1,3b;1,m7;1,4y7;1,-4wt;1,7bl;1,1q4;1,14r;1,1b2;1,7e;1,-5l4;1,33e;1,2m1;1,-1ba;1,-bjj;1,-nf;2,bxr;1,-btq;1,nd;1,1b7;1,137;1,1os;1,uu;1,1cn;1,10q;1,np;1,1ow;1,1jm;1,7m;1,cc;1,8;1,on;1,-6r5;1,7l2;1,-c71;1,2q;1,1l3;1,fm;1,7ie;1,1tf;1,-a5p;1,rf;1,cw;1,59o;1,40i;1,-9j;1,-2pu;1,-516;1,-26i;1,-1oi;1,-2qq;1,6qe;1,10x;1,-2zy;1,-417;1,36;1,4s;1,1dd;1,14e;1,4m;1,dl;1,mn;1,1h;1,4r;1,2d;1,hq;1,-64;1,nh;1,iq;1,vh;1,j1;1,cc;1,15v;1,pk;1,-7s6;1,9hp;1,3m;1,81;1,-d;1,1k;1,11u;1,ad;1,14w;1,7;1,-9u8;1,41x;1,1dk;1,4ad;1,-b66;1,j3;1,8u;1,p7;1,33;1,ak;1,38j;1,gq;1,e8;1,dt;1,jw;1,2aq;1,54;1,3h;1,3i;1,-4ae;1,-7mq;1,3bm;1,5o;1,4d;1,-bu;1,7th;1,-33e;1,8t;1,2y4;1,2f2;1,-510;1,wm;1,119;1,-b5c;1,hb;1,e3;1,t;1,1mr;1,2n;1,k;1,cn;1,uh;1,x;1,h5;1,o3;1,x;1,wl;1,3g;1,-1a;1,-11g;1,1hl;1,du;1,1b;1,-2b6;1,438;1,8e;1,fh;1w,34;1,9q;1,cy;1,4h;1,u;1,od;1,y0;1,gw;1,87;1,hv;1,-1;1,fq;1,-s;1,ky;1,17v;1,-eht;1,mv;1,52s;1,e6;1,-6a6;1,7x9;1,y8;1,ny;1,-yt;1,-7lu;1,ed;1,uv;1,1du;1,no;1,-1;1,gt;1,1vj;1,ja;1,-1;1,ow;1,20;1,3t;1,jc;1,3t;1,10;1,1qb;1,tp;1,2dj;1,-15m;1,2wv;1,-fg9;1,b2;1,9j;1,m;1,-rd;1,141;1,n8;1,2p;1,4xa;1,-4he;1,61;1,-1tz;1,2py;1,g;1,h5;1,13;1,-1w;1,3g;2,7m;1,7w;1,7k;1,-1sm;1,2cq;1,1c;1,108;1,k0;1,-6zg;1,7s0;1,7j;1,pn;1,gc;1,6o;1,-1f;1,jp;1,ko;1,f;1,7o;1,28;1,8v;1,ju;1,x7;1,i9;1,30;1,mi;1,p1;1,l2;1,-egz;1,1jc;1,1rr;1,6dh;1,o2;1,1jn;1,m0;1,-cpp;1,4x;1,cz;1,8c;1,2kc;1,ka;1,t2;1,1cd;1,687;1,h8;1,-cp4;1,2h3;1,9kc;1,-7p7;1,4p7;1,-8co;1,ais;1,-aw0;1,3m5;1,-1nv;1,j;1,4f;1,1kz;1,n8;1,83v;1,-cxy;1,210;1,g;1,3t2;1,5wh;1,-ahf;1,k7;1,b4;1,1fv;1,9v;1,12m;1,584;1,-4ww;1,8vf;1,p0;1,2s;1,-es5;1,1pv;1,s8;1,74i;1,-6zj;1,am;1,9i;1,4b;1,8b;1,6h;1,y3;1,169;1,dq;1,3jk;1,4x;1,9h;1,14n;1,tp;1,nc;1,1a;1,198;1,1n5;1,-lc;1,-f7c;1,zx;1,113;1,6px;1,4f5;1,1bz;1,14d;1,-9b0;1,96;1,-5p0;1,dt;1,18h;1,1cj;1,1y;1,1h;1,1xr;1,nh;1,tv;1,4c5;1,201;1,-77b;1,5dp;1,-1ja;1,-9qp;1,ahd;1,-a32;1w,-1;1,-wz;1,cum;1,-4k;1,-apy;1,7uv;1,-6yc;1,5pp;1,445;1,-7ol;1,6zh;1,-4zj;1,85s;1,-9vv;1,6er;1,-bxz;1,10f;1,j2;1,9s;1,28v;1,65;1,g4;1,12g;1,ib;1,3e;1,gi;1,1fk;1,le;1,57;1,ep;1,hu;1,3t;1,16t;1,qy;1,1qe;1,-by0;1,dg;1,19z;1,19r;1,6h;1,ru;1,8l;1,1vm;1,49c;1,-bkz;1,7up;1,-6gl;1,1kb;1,96;1,179;1,15y;1,1w4;1,ti;1,11w;1,hy;1,10k;1,1t9;1,1v2;1,-5wq;1,-19p;1,13x;1,2g;1,1v7;2,28c;1,-4dj;1,4p;1,1pg;1,-7yt;1,5lr;1,-843;1,5h;1,2hz;1,uf;1,kd;1,ov;1,c5;1,zb;1,51f;1,ek;1,ck;1,1eb;1,bp;1,1ct;1,-9fd;1,173;1,lg;1,33x;1,a8;1,1nc;1,-cdq;1,n9;1,3p;1,qo;1,19m;1,f5;1,t;1,26;1,43;1,x;1,1i;1,21;1,fy;1,7z;1,pd;1,3f;1,1n5;1,kk;1,ko;1,e8;1,1tm;1,5h;1,1r;1,16m;1,nd;1,t;1,ix;1,32;1,x3;1,kd;1,i3;1,yr;1,-en4;1,39u;1,3vh;1,-34v;1,12r;1,1fp;1,4xi;1,1d7;1,jp;1,-85q;1,-421;1,38y;1,5a;1,7jl;1,pp;1,-5vj;1,56n;1,-b0g;1,33c;1,-um;1,18n;1,-5a0;1,6ax;1,-1g4;1,7vn;1,-239;1,-1gy;1,49s;1,-8b9;1,181;1,-4qu;1,b1;1,fp;1,6ps;1,-26a;1,-5y8;1,c7t;1,2c1;1,-flz;1,4h;1,7i;1,p;1,cu;1,biz;1,-b4m;1,rg;1,om;1,hv;1,3c;1,o;1,22;1,14;1,a5;1,fd;1,3p;1,46;1,yn;1,pd;1,2fb;1,7b;1,3h;1,r9;1,vb;1,1iz;1,6c;1,ny;1,cv;1w,4l;1,39;1,4r;1,2ly;1,-9wp;1,-1ot;1,3u;1,43;1,1vj;1,1hs;1,wn;1,47i;1,o8;1,-7br;1,-53c;1,24n;1,yz;1,8fd;1,4g;1,gn;1,-css;1,1df;1,5a;1,mk;1,g2;1,31g;1,39w;1,-1v7;1,4o0;1,fa;1,1vd;1,-7tu;1,-6n0;1,5nm;1,s2;1,133;1,6ob;1,-drh;1,jm;1,th;1,y;1,9h;1,j8;1,mq;1,16t;1,cl;1,1c5;1,1ne;1,2n8;1,1se;1,mf;1,6h;1,gg;1,-5d4;1,l;1,-7f4;1,2d8;1,-1hj;1,gl;1,1b2;1,-35s;1,94;1,2a;2,x;1,1f;1,ls;1,n8;1,4;1,73;1,fy;1,9t;1,45;1,mp;1,d5;1,bc;1,n8;1,5u;1,3d;1,z;1,2rc;1,-1rz;1,47;1,-5w;1,k4;1,9l;1,-3n9;1,4g5;1,pr;1,cy;1,b;1,-2;1,as;1,4b;1,-8jl;1,9wz;1,7a;1,3f;1,tm;1,6u;1,8y;1,cp;1,dw;1,c;1,sq;1,gt;1,c7;1,eb;1,-uw;1,-dmz;1,eg;1,8n;1,s6;1,ss;1,13t;1,l3;1,1og;1,239;1,mq;1,173;1,ls;1,2fj;1,fm;1,-alh;1,co7;1,-eko;1,2fs;1,s;1,2qx;1,yl;1,yy;1,gs;1,f9;1,-36a;1,1ei;1,4ox;1,-6ui;1,gu;1,-4tl;1,809;1,-3f1;1,-2ju;1,crw;1,-557;1,-7qe;1,akk;1,-6jv;1,-52e;1,16f;1,uw;1,wv;1,1eu;1,6a6;1,rr;1,1jm;1,-ddu;1,3na;1,8jq;1,-b7p;1,axn;1,-cgu;1,-mw;1,pp;1,a7j;1,12t;1,-59y;1,-2ji;1,9g1;1,-8a1;1,9jm;1,-5gw;1,-1ot;1,-6qo;1,4cp;1,7en;1,1l0;1,-8ee;1,-5w1;1,2pc;1,k4;1,9nd;1,-c13;1,bf3;1,-2fc;1,168;1,-7sq;1,1d2;1,-4mq;1,ky;1w,1lp;1,jh;1,bsf;1,-eer;1,233;1,18j;1,8g0;1,-59o;1,1xr;1,-26;1,-5tn;1,80a;1,-3eu;1,-ai;1,-3st;1,ap;1,p2;1,7z;1,2ll;1,251;1,-95h;1,3ax;1,-3ap;1,1w1;1,-8q;1,1zb;1,2ze;1,2mi;1,s0;1,1i;1,3w;1,2r7;1,-17f;1,-kz;1,-81c;1,wm;1,f7;1,7a2;1,-6q8;1,12j;1,2k;1,1dk;1,se;1,-5wu;1,7cf;1,mw;1,4jj;1,-ek9;1,2xc;1,t6;1,51;1,cl;1,ew;1,310;1,-vr;1,2v4;1,-i;1,2un;1,f8;1,-cw0;1,1kc;1,ih;1,2r7;2,6m;1,1kh;1,bd;1,52y;1,-a85;1,a9a;1,1vu;1,-18x;1,-1p6;1,-2or;1,-e5;1,2f6;1,-agq;1,mu;1,6t;1,31v;1,zm;1,zf;1,1wz;1,107;1,75;1,141;1,ni;1,21z;1,-83y;1,1mr;1,km;1,2dx;1,13k;1,4d2;1,yt;1,-f55;1,88k;1,-n3;1,na;1,y7;1,-11b;1,-38g;1,-2h3;1,6qz;1,-27v;1,f;1,-73p;1,ctz;1,-72u;1,1ke;1,5ct;1,1ub;1,-eze;1,9k0;1,-5p0;1,4vn;1,57a;1,1fo;1,-dwv;1,db;1,96z;1,34o;1,-e4o;1,kw;1,86;1,3n;1,e;1,20b;1,17q;1,9x;1,dq;1,xr;1,g;1,16i;1,2v;1,8u;1,9z;1,1rh;1,rv;1,ql;1,1c0;1,-3c5;1,4ci;1,-6e5;1,7mx;1,65;1,-alu;1,mk;1,2yp;1,ai;1,do;1,2gj;1,bv;1,-a84;1,13;1,5x;1,125;1,zo;1,6t;1,8m;1,bb;1,1c;1,1e;1,kl;1,18k;1,6w;1,1ra;1,70;1,df;1,93;1,s3;1,bw;1,8e;1,1l2;1,em;1,ea;1,qs;1,1cv;1,al;1,-98w;1,3l9;1,-8m7;1,2at;1,og;1,1jt;1,up;1,1nh;1,k4;1,1ol;1w,699;1,-ay9;1,3m5;1,-7oe;1,6s2;1,7du;1,-brb;1,6rb;1,gk;1,-nt;1,-6l8;1,3t;1,49p;1,15w;1,452;1,-7v9;1,-2v0;1,4w;1,6t1;1,-1aq;1,432;1,-bp3;1,31x;1,23z;1,f2;1,jv;1,15s;1,w6;1,2yo;1,dp;1,f8;1,-90a;1,z4;1,3jq;1,st;1,1s5;1,381;1,-1i;1,-2ty;1,gh;1,474;1,-e3w;1,23v;1,17k;1,1jk;1,jd;1,5n6;1,18;1,294;1,-a24;1,33b;1,-7op;1,5n;1,1s8;1,97;1,8r;1,9y;1,-204;1,2fv;1,49;1,ai;1,gw;1,ld;2,1c;1,5j;1,1ds;1,y0;1,1rk;1,17u;1,22;1,73;1,1qb;1,90;1,1y;1,3y;1,1pk;1,14;1,-dxy;1,459;1,1bv;1,4hk;1,g3;1,7d;1,29q;1,-ag7;1,2mq;1,9cl;1,-3zi;1,65;1,-aq0;1,o0;1,2m2;1,-9w;1,1qg;1,3nm;1,1ka;1,1hq;1,3j;1,-5g1;1,-2xq;1,n2;1,21v;1,-5wp;1,716;1,84p;1,-ej0;1,fp;1,ft;1,fz;1,1rl;1,5m;1,2wc;1,-4oc;1,6xn;1,2d;1,1p;1,53p;1,-9rd;1,5av;1,-9xh;1,9o;1,e8;1,1cb;1,17n;1,g;1,47;1,1q2;1,-526;1,avr;1,37w;1,5u;1,-548;1,5fy;1,-e12;1,1ja;1,5ud;1,gh;1,-7lu;1,7eo;1,2ng;1,-1vv;1,-8jb;1,1q2;1,4zi;1,1vk;1,f5;1,3iq;1,q;1,3d;1,-cr2;1,lm;1,1gg;1,yg;1,b70;1,-e6o;1,9x6;1,3bn;1,-btz;1,2fm;1,1lg;1,1xe;1,3w1;1,188;1,-442;1,-7s3;1,14k;1,1qa;1,51;1,x0;1,10f;1,38y;1,1ii;1,-a86;1,-17;1,lp;1,8x;1,rv;1,7s;1,gk;1,9f;1,-1;1,1m;1,a5;1,t7;1,52;1,d3;1,3f;1,9e;1w,156;1,c;1,t4;1,1fd;1,16h;1,j7;1,d1;1,9l;1,68;1,eu;1,eo;1,7s;1,f4;1,v0;1,fg;1,17v;1,s6;1,3d;1,-fml;1,2a;1,do;1,cp;1,z8;1,gu;1,wl;1,bf;1,1;1,h2;1,vp;1,2v;1,51;1,76;1,-4lc;1,8lr;1,p5;1,72;1,1ug;1,b0;1,1f;1,14v;1,qc;1,-d1u;1,dfw;1,-dn9;1,-g2;1,hz;1,11o;1,2dm;1,hu;1,27n;1,zj;1,kg;1,4o0;1,-cgz;1,53y;1,-7v;1,-3uu;1,18s;1,-zc;1,2qg;1,4wf;1,-93u;1,7ad;2,-3ml;1,41r;1,6ss;1,o7;1,-e0g;1,dq;1,2ge;1,ab;1,tw;1,-4it;1,44w;1,-29w;1,6yv;1,-553;1,aad;1,-a7g;1,ac4;1,-a9h;1,-52v;1,8t;1,rp;1,2y9;1,vm;1,134;1,6xl;1,-cnr;1,98g;1,6du;1,-fy0;1,3tn;1,2la;1,4r;1,4bs;1,-9ls;1,3p3;1,aaj;1,-c42;1,5uq;1,-63t;1,-6e;1,8k6;1,-4wi;1,4g7;1,-24d;1,1dg;1,-7sf;1,6wk;1,-398;1,26n;1,-75z;1,18p;1,4qn;1,8u;1,130;1,66k;1,18a;1,-ac6;1,-2vg;1,-2v;1,-1o3;1,h4;1,34;1,3gx;1,3bl;1,4yg;1,ip;1,21o;1,-d8q;1,4tv;1,-pk;1,-5tk;1,4n0;1,452;1,19;1,512;1,1g8;1,-bia;1,149;1,4wx;1,-872;1,d7;1,398;1,1fk;1,rb;1,1c0;1,h1;1,w2;1,-a5j;1,4c6;1,b01;1,-7vv;1,-32k;1,-40z;1,dty;1,-c0x;1,17b;1,56r;1,376;1,-axt;1,293;1,5lh;1,4tx;1,-d4v;1,-wy;1,nr;1,1gm;1,4ym;1,2rg;1,3h4;1,-a09;1,4vx;1,-76m;1,2d1;1,5u3;1,1pk;1,w7;1,uy;1,1qh;1,-9cz;1,5vf;1,2w5;1,-a4q;1,-1;1,2b5;1,1w9;1w,42j;1,uj;1,-bgp;1,-15q;1,d5;1,bh;1,78;1,1ju;1,k8;1,f7;1,6a;1,gk;1,mr;1,5t;1,1al;1,-63;1,14a;1,1;1,e2;1,tb;1,32d;1,cj;1,14i;1,1z;1,2s;1,15b;1,-307;1,-96g;1,-231;1,5t;1,-97;1,by3;1,xi;1,1qp;1,-e3n;1,2q7;1,-yu;1,f7;1,lb;1,10i;1,w;1,5j;1,ez;1,ha;1,3y;1,mr;1,bv;1,ke;1,pg;1,13b;1,yj;1,3a;1,uh;1,3k;1,xk;1,bk;1,kp;1,gr;1,17c;1,i5;1,-az0;1,7n;1,1pd;2,9d;1,6p;1,3mg;1,1c;1,-3lo;1,3id;1,1md;1,8u;1,-6mr;1,5l8;1,423;1,-91;1,-89o;1,37q;1,1cs;1,2lp;1,-d89;1,zo;1,1y3;1,2pg;1,yv;1,4bm;1,2o;1,oq;1,-aym;1,di;1,1na;1,25l;1,9m;1,28u;1,3h;1,9r;1,3ql;1,i;1,1rf;1,106;1,-2y;1,-aul;1,3y4;1,1fo;1,1vn;1,-6ge;1,3id;1,-6vw;1,5a0;1,9n;1,12l;1,9c;1,lu;1,tj;1,54k;1,-5gq;1,78x;1,-frr;1,3i0;1,uv;1,6fr;1,-b12;1,14;1,fg;1,-jd;1,q3;1,202;1,1wr;1,ko;1,117;1,12b;1,mb;1,a3;1,hb;1,jv;1,13c;1,1nn;1,14a;1,9f;1,x2;1,bn;1,-dq5;1,8ja;1,-90m;1,od;1,3y7;1,184;1,sl;1,gz;1,2ph;1,2ma;1,1h5;1,14k;1,g8;1,-8cf;1,-5jz;1,47s;1,32u;1,5db;1,-eii;1,2a;1,2d;1,fg;1,6y;1,26h;1,gy;1,3va;1,13e;1,1w7;1,31d;1,w3;1,1r;1,k;1,1hp;1,5n;1,-b7g;1,y6;1,-50d;1,3w;1,5yd;1,4qi;1,-8ah;1,aq;1,91;1,2oj;1,fa;1,25x;1,c6;1,hn;1w,vz;1,27p;1,ll;1,-cfe;1,e25;1,-9lo;1,14m;1,5kp;1,8d;1,1tv;1,-dj2;1,1hp;1,w9;1,1m;1,1lf;1,h1;1,o;1,ra;1,bp;1,nn;1,4a;1,1rl;1,t0;1,3h;1,1cd;1,1vn;1,-cip;1,f8m;1,-7bj;1,1dz;1,3on;1,-1ng;1,-bl5;1,v3;1,an9;1,-64n;1,6l6;1,-2bh;1,-6d2;1,1cf;1,aqa;1,-fo9;1,-1;1,faw;1,-3hh;1,-x6;1,-2h;1,-5m0;1,132;1,1zt;1,1q6;19,-6rt;1,-3cs;1,5;1,l;1,7;1,5;1,6;1,3;1,3;1,k;1,2;1,16;1,3;1,c86;1,-c81;1,a6g;1,-6x1;1,-39b;1,g;1,1;1,1;1,2;1,e;1,3;1,3;1,o;1,-1;1,-9;1,2;1,-4;1,l;1,7;1,f;1,-e;1,o;1,i;1,29;1,-16;1,17;1,2;1,-6;1,-g;1,1b;1,i;1,7;1,9;1,-t;1,-i;1,7;1,x;1,-y;1,n;1,g;1,aq;1,-90;1,b;1,-h;1,a;1,3;1,-a;1,9;1,-a;1,k;1,1;1,1h;1,e;1,-k;1,m;1,-5;1,-w;1,-6h;1,62;1,17;1,8;1,3;1,-1a;1,-f;1,y;1,-b;1,1p;1,4;1,4ho;1,-4ha;1,-5;1,-8;1,i;1,-4;1,m;1,c;1,8;1,q;1,-l;1,1b;1,-2;1w,n;1,1;1,-n;1,f;1,k;1,8;1,7;1,8;1,-a;1,b;1,b;1,-4;1,k;1,-8;1,1;1,k;1,-1;1,-1;1,6;1,7;1,p;1,-3;1,5;1,-1;1,4;1,1;1,i;1,-6;1,8;1,e;1,87q;1,-87j;1,1;1,4;1,i;1,2;1,11y;1,-11o;1,-3;1,6;1,2;1,2;1,2;1,1;1,e;1,2;1,-4;1,7;1,1;1,1;1,8;1,-2;1,1;1,-2;1,5;1,8;1,8;1,4;1,i;1,5;1,ad1;1,-acs;1,4;2,3;1,5;1,9;1,6;1,7;1,9;1,-6;1,p;1,3;1,4;1,5;1,6;1,m;1,-b;1,7;1,1;1,i;1,-a;1,m;1,a;1,-b;1,a;1,c;1,-2;1,g;1,7;1,-2;1,-x;1,n;1,9;1,c2f;1,-1;1,-c1n;1,1;1,f;1,-7;1,c;1,c;1,a;1,7;1,5;1,3;1,dtz;1,-du5;1,j;1,2;1,3;1,1;1,d;1,2;1,6r4;1,-6qz;1,3;1,-1;1,6;1,5;1,9;1,c;1,2;1,2;1,5;1,8;1,6;1,-1;1,-10u;1,10y;1,4;1,-af;1,aw;1,b;1,5;1,14a;1,-13x;1,-4;1,b;1,k;1,a;1,6;1,-1;1,9;1,2;1,6;1,d;1,7yn;1,5af;1,-d8a;1,3rx;1,25u;1,-5xc;1,-6;1,5;1,d;1,7;1,1o;1,3;1,-k;1,1;1,f;1,-e;1,8;1,-d;1,-c;1,1d;1,1t;1,-q;1,p;1,-1b;1,i;1,6;1,-7;1,y;1,-n;1,5;1,-a;1,e;1,c;1,-a;1,1t;1,-11;1,m;1,-j;1,7;1,o;1,4;1,-w;1w,3;1,n;1,-u;1,q;1,-2;1,s;1,d;1,1;1,15;1,5;1,-n;1,-f;1,-1;1,d;1,-o;1,2f;1,7;1,z;1,-n;1,-u;1,1a;1,-n;1,h;1,1;1,-v;1,-5;1,16;1,1o;1,-p;1,-5t;1,63;1,l;1,-10;1,3;1,q;1,6;1,g;1,-1e;1,7;1,12;1,-y;1,x;1,1e;1,-l;1,q;1,-r;1,o;1,8;1,-g;1,1s;1,-t;1,v;1,-o;1,-1;1,u;1,-y;1,2d;1,2;1,5fz;1,-5gr;1,2;1,-4;1,6;2,1f;1,-7;1,-1h;1,1p;1,-2;1,s;1,-6;1,a;1,m;1,-c;1,-5;1,m;1,9;1,8;1,-2;1,e;1,-6;1,5;1,2;1,-3;1,8;1,6;1,3;1,2;1,4;1,n;1,b;1,7;1,-1;1,5;1,5;1,-1;1,3;1,2;1,6;1,5;1,-2;1,-9b;1,9h;1,a;1,h;1,1;1,m;1,-j;1,5;1,f;1,q;1,2f;1,-1k;1,-13;1,u;1,a;1,a;1,d;1,j;1,-f;1,6;1,6;1,j;1,3;1,e;1,-2;1,1;1,1j;1,-1g;1,d;1,14;1,e;1,4;1,2d;1,-29;1,1t;1,-n;1,11;1,3tc;1,-3u6;1,-l;1,1o;1,c;1,1g;1,-q;1,c;1,f;1,10;1,-z;1,-3;1,-a;1,n;1,e;1,-2;1,6;1,2;1,-1;1,d;1,-9;1,8;1,-5;1,g;1,b;1,-1;1,2;1,1;1,1;1,5;1,8;1,6;1,b;1,32j;1,-329;1,7;1,1;1,5;1,6;1,6;1,6ms;1,-6m5;1,-5;1,-2;1,c;1,-2;1,a;1,-2;1,7;1,5;1,-3;1w,f;1,9;1,s;1,-20v;1,25;1,1yw;1,f;1,k;1,y;1,-c;1,-27;1,24;1,1;1,23;1,-6;1,-e;1,b;1,-j;1,h;1,12;1,18;1,-z;1,-k;1,1;1,18;1,8;1,1c;1,y;1,2;1,d;1,-9;1,-5;1,12;1,-c;1,f;1,3;1,-j;1,10;1,1;1,h;1,-1;1,b;1,s;1,-2q;1,2i;1,c;1,8;1,5;1,2;1,-5;1,h;1,4;1,5;1,1;1,a;1,4;1,7;1,3;1,2;1,3;1,1zk;1,-1zi;1,6;2,3;1,z;1,i;1,b;1,4;1,2;1,b;1,-4;1,k;1,2;1,-4;1,-4;1,7;1,6;1,5;1,6;1,-3;1,i;1,2;1,1;1,5;1,6;1,d;1,2;1,6;1,g;1,1;1,8;1,5;1,8;1,5;1,-3;1,-1;1,-66;1,6z;1,2;1,-2rw;1,2s4;1,3;1,j;1,5;1,3;1,-l5;1,ls;1,g;1,-5;1,6;1,-5;1,e;1,-7;1,9;1,i;1,g;1,k;1,-3;1,-d;1,4f;1,-4i;1,x;1,a;1,2;1,1x;1,-1p;1,-4;1,-a;1,3;1,e;1,-8;1,-1;1,-1;1,1g;1,6;1,-4;1,-3;1,x;1,7;1,3;1,h;1,-3;1,-2;1,w;1,-5;1,f;1,2;1,f;1,-19;1,13;1,5;1,d;1,4;1,6;1,-1;1,4;1,5;1,g;1,7;1,3;1,m;1,f;1,-1;1,-8;1,a;1,r;1,1;1,d;1,-1;1,-3;1,e;1,9;1,-3;1,b;1,3;1,2;1,-t;1,1a;1,1;1,4;1,coy;1,-cot;1,x;1,x;1,1;1,6;1,8;1,-1;1w,7;1,d;1,-6;1,-3;1,1;1,7;1,-1;1,7;1,1;1,3;1,5;1,2;1,-3;1,4;1,4;1,6;1,5;1,6;1,2c;1,-1;1,-29;1,6;1,5;1,j;1,4;1,b;1,9;1,7;1,4;1,2;1,-v;1,y;1,5;1,1;1,2;1,8;1,c;1,6;1,4;1,c;1,-1;1,-3;1,b;1,-2;1,9;1,-a;1,n;1,-5;1,-1;1,8;1,8;1,5;1,f;1,q;1,11;1,-n;1,k;1,-7;1,-k;1,5y;1,-50;1,y;1,1r;2,-1z;1,-9;1,p;1,-r;1,z;1,-m;1,-6;1,m;1,-5;1,-n;1,17;1,w;1,-p;1,15;1,d;1,-o;1,-l;1,-4;1,7;1,m;1,-w;1,x;1,-y;1,16;1,-1;1,-i;1,14;1,c;1,2i;1,-2s;1,n;1,-m;1,n;1,-5;1,1;1,-5;1,l;1,-s;1,2e;1,-15;1,14;1,-d;1,-v;1,-5g;1,5p;1,9;1,-h;1,z;1,39;1,-1k;1,-f;1,-g;1,1;1,9;1,-c;1,6;1,9;1,u;1,-12;1,-a;1,s;1,1;1,1l;1,-9;1,-m;1,-1;1,z;1,-b;1,-3;1,-g;1,8;1,9;1,5;1,2;1,1b;1,4;1,-v;1,1;1,1;1,h;1,9;1,-5;1,-a;1,c;1,-i;1,-2;1,-a;1,y;1,10;1,-3;1,-f;1,11;1,-o;1,6;1,-g;1,7;1,q;1,3;1,u;1,-2;1,-1;1,1a;1,-1b;1,-5;1,3;1,-c;1,h;1,5v2;1,-5v0;1,p;1,-3;1,j;1,4;1,-6;1,b;1,-2;1,-1;1,2;1,2;1,8;1,1;1,4;1,-1;1,8;1,7;1w,3;1,3;1,9;1,4;1,2;1,2;1,1;1,e;1,d;1,g;1,5;1,-8;1,5;1,8;1,k;1,6;1,7;1,-b;1,k;1,1;1,3;1,1q;1,-29;1,h;1,1v;1,-6;1,-m;1,k;1,1c;1,-1l;1,em;1,-ek;1,k;1,-g;1,-2;1,-8;1,5;1,-18;1,1a;1,1v;1,-u;1,3;1,1i;1,-11;1,6;1,-p;1,6;1,2j;1,-i;1,f;1,5r;1,-5p;1,1z;1,-8;1,-e;1,17;1,-1h;1,19;1,-k;1,-6;1,m;1,m;1,-22;2,-2;1,2d;1,17;1,-15;1,6;1,t;1,-q;1,9;1,10;1,-1e;1,2a;1,u;1,-1a;1,d;1,j;1,g;1,6f;1,-7a;1,h;1,-p;1,2g;1,8;1,7;1,-14;1,64;1,-45;1,-2;1,i;1,4;1,-x;1,1g;1,u;1,-8;1,-d;1,2;1,-c;1,t;1,-m;1,1b;1,-a;1,5r6;1,-5rd;1,1;1,-fp;1,fr;1,c;1,1p;1,-1i;1,-2;1,-2;1,8;1,6;1,-3;1,r;1,4;1,-n;1,v;1,-1;1,8;1,9;1,1;1,2;1,-1;1,2;1,36b;1,-35v;1,e;1,-1;1,-8;1,b;1,6;1,-1;1,l;1,6;1,a;1,1;1,7if;1,-7hr;1,4;1,c;1,c;1,c;1,3;1,-5;1,3;1,8;1,6;1,9;1,-2;1,7;1,1;1,g;1,ap;1,-a0;1,-7;1,-8;1,ag;1,-8u;1,1;1,-2;1,-o;1,1f;1,-b;1,5;1,-8;1,t;1,-1;1,7;1,3;1,1;1,-9;1,3;1,e;1,j;1,5;1,6;1,-5;1,-5;1,k;1,5;1,10;1,-8;1,g;1,-b;1,-2;1w,8;1,-c;1,u;1,4;1,6;1,-4h;1,4n;1,3;1,7;1,5;1,2;1,o;1,7;1,8;1,8;1,1;1,9ht;1,-9hm;1,h;1,-9;1,b;1,-9;1,-1;1,f;1,o;1,2;1,-7;1,a;1,1;1,11;1,-p;1,1l;1,-19;1,-i;1,y;1,-1;1,r;1,-5;1,-s;1,1e;1,1k;1,-1n;1,1k;1,-1l;1,1i;1,-1d;1,18;1,-6;1,-1;1,5;1,c;1,-1h;1,l;1,-8;1,x;1,j9;1,-hq;1,14;1,-t;1,n;1,d;1,-r;1,s;2,2t;1,-3s;1,1a;1,a;1,k;1,8;1,w;1,-g;1,u;1,-p;1,9;1,-2;1,-o;1,ff;1,-dx;1,-1x;1,1t;1,-l;1,q;1,2d;1,-3m;1,-f;1,3n;1,-1j;1,1q;1,-1c;1,22;1,4;1,-1x;1,17;1,-1r;1,7;1,j;1,-i;1,2p;1,-10;1,-e;1,-19;1,c;1,1u;1,-18;1,-p;1,f;1,1l;1,2;1,-g;1,9;1,-2;1,-2j;1,4z;1,-2;1,-r;1,s;1,-d;1,-n;1,16;1,-g;1,-1h;1,1n;1,-1j;1,s;1,-15;1,1d;1,-3;1,-1;1,10;1,-n;1,20;1,-4;1,y;1,-h;1,2;1,i;1,-l;1,g;1,-2qu;1,2qq;1,j;1,-y;1,8;1,-s;1,3r;1,-4d;1,f;1,-4;1,-7;1,v;1,16;1,a;1,q;1,p;1,-s;1,7f;1,-7l;1,-7;1,-b;1,u;1,-2c;1,31;1,-1d;1,13;1,-15;1,v;1,8;1,4v;1,-4e;1,-g;1,1d;1,-1k;1,2u;1,-1o;1,1u;1,-1d;1,r;1,-9;1,d;1,-u;1,-g;1,-m;1,32;1,-3;1,j;1,-s;1,u;1,1;1w,-c;1,5fk;1,-5ek;1,8;1,-1;1,-a;1,-5;1,-7;1,1e;1,-d;1,e;1,-1h;1,1c;1,g;1,h;1,a;1,5ch;1,-5cs;1,o;1,4;1,9i3;1,-9hu;1,p;1,-1;1,2at;1,-2ar;1,911;1,-90n;1,-4;1,6;1,7;1,9;1,-5;1,7;1,4;1,2;1,n;1,1;1,6;1,1;1,4;1,-1;1,a;1,b;1,-3;1,9;1,6;1,6;1,1;1,4;1,3;1,-1;1,2;1,4;1,5;1,a;1,5;1,8;1,c;1,d;1,-1;1,8;1,-4;2,a1b;1,-a0m;1,b;1,1;1,7;1,9;1,-1;1,1n;1,-9;1,d;1,8;1,o;1,b;1,d;1,-p;1,q;1,-t;1,-m;1,b;1,v;1,-2;1,1g;1,19;1,-u;1,-m;1,q;1,-i;1,o;1,-1b;1,3;1,d;1,-4;1,x;1,k;1,-m;1,h;1,1h;1,5da;1,-5cn;1,-b;1,i;1,-5;1,-v;1,s;1,-2;1,-x;1,-6;1,2f;1,1c;1,-1b;1,-a;1,v;1,-w;1,1h;1,7;1,gf;1,-gv;1,38;1,s;1,-b;1,-2d;1,i;1,v;1,-1a;1,e;1,12;1,-e;1,-i;1,s;1,-m;1,-d;1,1h;1,-x;1,b;1,-f;1,l;1,4;1,1r;1,1t;1,-1s;1,-l;1,2h;1,-j;1,-x;1,-r;1,20;1,-1s;1,23;1,-15;1,-1a;1,10;1,-9;1,k;1,-16;1,63;1,-6a;1,r;1,22;1,14;1,-i;1,1d;1,-i;1,s;1,-m;1,-e;1,l;1,-i;1,y;1,1;1,-1y;1,m;1,t;1,-z;1,4i;1,-1c;1,8r;1,-9s;1,c;1,6;1,1t;1,-25;1,1r;1,-1u;1,1v;1,-2u;cp0,36;1,-17;1,-s;1,3z;1,-c;1,-2;1,9;1,-1;1,-h;1,-k;1,48;1,-3q;1,l;1,-6;1,-10;1,1i;1,3;1,1d;1,-2k;1,25;1,-g;1,-2;1,3;1,l;1,d;1,-s;1,1h;1,-a;1,n;1,-o;1,4;1,p;1,-3;1,-j;1,1a;1,2;1,-h;1,n;1,-g;1,e;1,-h;1,t;1,-1;1,-4m;1,4p;1,-5;1,7;1,h;1,e;1,-c;1,v;1,i;1,1i;1,-7;1,t;1,1u;1,-1x;1,c;1,-5;1,-5;1,1d;1,-k;1,i;2,-4;1,1c;1,-c;1,v;1,-3;1,24;1,-g;1,1f;1,-y;1,-4;1,-m;1,a;1,m;1,z;1,30;1,-3b;1,h;1,j;1,4;1,17;1,-u;1,5;1,k;1,-9;1,b;1,-6;1,i;1,c;1,-5;1,e;1,7;1,-3;1,6;1,e;1,3;1,b;1,d;1,5;1,-1;1,4;1,2;1,9;1,1;1,3;1,1;1,6;1,5;1,d;1,s;1,a;1,4;1,-1;1,6;1,b;1,4;1,c;1,5;1,i;1,-7;1,h;1,3;1,-2;1,a;1,4;1,g;1,-2;1,1;1,o;1,-2;1,-6w8;1,6x4;1,-d;1,i;1,-6;1,7;1,n;1,-5;1,-6;1,-4;1,p;1,g;1,1;1,8ll;1,-8ld;1,j;1,-2;1,8;1,8;1,-3;1,6;1,-1;1,26;1,-l;1,r;1,-j;1,5;1,11;1,9;1,-g;1,5g;1,-4d;1,2y;1,-22;1,-19;1,1m;1,8;1,r;1,-m;1,w;1,-6;1,-o;1,r;1,d;1,7;1,-d;1,7;1,c;1,8;1,d;1,j;1,9;1,z;1,5;1,5;1,-6b;1w,6n;1,3;1,4;1,2;1,5;1,4;1,-2;1,1;1,7;1,-1;1,d;1,-1;1,2;1,7;1,2;1,-1;1,8;1,-2;1,b;1,8;1,6;1,g;1,8;1,9;1,-3;1,-1;1,i;1,-l;1,k;1,f;1,-5;1,3;1,4;1,2;1,b;1,-2;1,g;1,1;1,-j;1,m;1,-1;1,-7;1,i;1,6;1,3;1,8;1,-2;1,v;1,-f;1,g;1,-e;1,8;1,-5;1,4;1,-b;1,s;1,-3;1,8;1,7;1,a;1,-5;1,w;1,1;2,-3;1,5;1,-h;1,a;1,-8;1,1;1,o;1,2;1,-4;1,m;1,8;1,-7;1,1;1,1;1,2;1,g;1,-4;1,b;1,c;1,1;1,-2;1,m;1,-4;1,9;1,1;1,6;1,1;1,1;1,-3;1,5;1,4;1,2;1,4;1,2;1,4;1,4;1,3;1,5;1,3;1,3;1,8;1,-3;1,6;1,1;1,m;1,4;1,4;1,1;1,1;1,8;1,b;1,9;1,-4;1,c;1,3;1,4;1,2;1,3;1,30l;1,-304;1,d;1,-1;1,-3;1,11;1,-5;1,-6;1,7;1,1;1,-b;1,s;1,1;1,f;1,j;1,e;1,3;1,-g;1,a;1,q;1,-1;1,-5;1,l;1,-3;1,6;1,f;1,-2;1,i;1,6;1,3;1,6;1,-3;1,1;1,-2;1,c;1,6;1,a;1,3;1,2;1,7;1,b;1,e;1,g;1,6;1,7o;1,-7a;1,7e;1,-6d;1,21;1,-q;1,i;1,-a;1,u;1,-e;1,n;1,i;1,-b;1,5;1,y;1,-b;1,5;1,9;1,-m;1,-2;1,9;1,5;1,y;1w,-5;1,-d;1,z;1,-9;1,j;1,b;1,-1;1,8;1,j;1,-1;1,l;1,w;1,-9;1,8;1,-5;1,-5;1,-2;1,13;1,5;1,b;1,j;1,a;1,7fo;1,-7fl;1,4;1,5;1,6;1,1;1,f;1,c;1,i;1,5;1,-b;1,2;1,11;1,5;1,b;1,1;1,7;1,-1;1,-4f;1,4x;1,a;1,3;1,-7;1,c;1,k;1,-e;1,o;1,1;1,7;1,7ck;1,-7cd;1,9;1,4;1,b;1,f;1,-2;1,3;1,-2;1,j;1,v;1,-o;2,6;1,f;1,-1;1,-5;1,4as;1,-4ak;1,3;1,3;1,2;1,6;1,-2;1,6;1,1;1,3;1,4;1,1;1,4;1,7;1,3;1,i;1,d;1,-5;1,-4;1,19;1,-r;1,1;1,5;1,n;1,-d;1,e;1,q;1,16;1,-3a;1,21;1,-1u;1,1t;1,-7;1,1c;1,-g;1,f;1,-d;1,9;1,1;1,-5;1,2;1,1b;1,-5;1,7;1,-i;1,f;1,-2;1,-f;1,7;1,-3;1,-1e;1,1o;1,1e;1,-a;1,b;1,3;1,-r;1,i;1,n;1,c;1,14;1,3;1,-1a;1,-1;1,3f;1,-2o;1,7;1,c;1,-w;1,4;1,w;1,-a;1,-n;1,19;1,4;1,3;1,-b;1,o;1,-c;1,i;1,f;1,-9;1,h;1,-5;1,-f;1,g;1,8;1,7;1,5;1,-e;1,f;1,7;1,9;1,e;1,d;1,k;1,9;1,-b;1,9;1,-a;1,7;1,b;1,-1;1,-1;1,-3;1,b;1,4;1,3;1,5;1,-3;1,m;1,-6;1,a;1,6;1,5zt;1,-5zg;1,3;1,2;1,2;1,4;1,c;1w,-4;1,q;1,-7;1,-b;1,1n;1,6;1,-t;1,4;1,d;1,-a;1,h;1,19;1,-t;1,-8;1,10;1,-a;1,6;1,-v;1,k;1,1c;1,-a;1,-1a;1,1g;1,-i;1,u;1,v;1,-c;1,-b;1,i;1,i;1,-a;1,-i;1,42;1,-4b;1,d;1,19;1,-10;1,-p;1,h;1,14;1,5;1,7;1,-6;1,t;1,-9;1,-h;1,10;1,5;1,p;1,-2;1,-f;1,v;1,-i;1,-m;1,2;1,n;1,10;1,w;1,-17;1,-6;1,4;1,a;1,-c;2,-5;1,8;1,19;1,-a;1,-7;1,8;1,-5;1,1;1,v;1,-f;1,-1;1,j;1,-1;1,8;1,-4u;1,4o;1,3e9;1,-3e7;1,9;1,1;1,3;1,6;1,-2;1,3;1,1;1,2;1,-8;1,d;1,1;1,4c;1,2;1,b;1,7;1,1;1,1;1,2;1,1;1,4;1,-1;1,4;1,7;1,1;1,8;1,1;1,-2;1,h;1,a;1,4;1,-3;1,5;1,-1;1,5;1,8;1,a;1,-1;1,-3;1,9;1,c;1,3;1,7;1,-b;1,8;1,2;1,2bd;1,-2b0;1,1;1,4;1,b;1,-1;1,d;1,5;1,3;1,a;1,6;1,4wz;1,-4wm;1,-2;1,7;1,7;1,6;1,1;1,3;1,5;1,7;1,n;1,-4;1,f;1,-4;1,c;1,6;1,2;1,5;1,3;1,6;1,b;1,-1;1,-2;1,6;1,3;1,4;1,2;1,5;1,2;1,-1;1,m;1,-8;1,7;1,j;1,-9b1;1,9b0;1,1b;1,a;1,-c;1,4;1,-p;1,m;1,-4;1,1f;1,-q;1,2;1,16;1,e;1,-6;1,c;1,s;1w,474;1,-479;1,-8;1,l;1,-2;1,-2d;1,39;1,-3;1,-9;1,1;1,e;1,f;1,5;1,2;1,-a;1,2;1,u;1,-b;1,f;1,-1;1,-1w;1,1g;1,m;1,7;1,5;1,9;1,-6;1,5;1,3;1,2;1,-8;1,f;1,4;1,4;1,8;1,-1;1,-g;1,i;1,5;1,1;1,7;1,j;1,1;1,3;1,3;1,1;1,3;1,2;1,3;1,3;1,3;1,6;1,j;1,2;1,d;1,-5;1,d;1,p;1,-1;1,5;1,-3;1,5;1,5;2,-2;1,6;1,2;1,1;1,-1p;1,1v;1,6;1,1;1,6;1,f;1,5;1,p;1,-c;1,s;1,-f;1,1h;1,2;1,-4;1,-d;1,y;1,-1;1,7;1,49;1,-40;1,-8;1,-2;1,-r;1,14;1,-16;1,19;1,-1c;1,2k;1,-1;1,-u;1,s;1,-1;1,f;1,-7;1,n;1,-b;1,-m;1,-4;1,-k;1,1;1,31;1,l;1,g;1,-b;1,3;1,-c;1,-37;1,2z;1,-7;1,3;1,-e;1,1l;1,-1u;1,2;1,17;1,-n;1,v;1,24;1,v;1,-14;1,-t;1,1b;1,6;1,-17;1,1f;1,-22;1,1i;1,g;1,-13;1,i;1,r;1,l;1,-2;1,-2r;1,3f;1,5q;1,-7f;1,36;1,-1v;1,i;1,7y;1,-5y;1,-d;1,-c;1,1u;1,-1r;1,k;1,-p;1,-z;1,-q;1,1v;1,a;1,-1w;1,45;1,-2w;1,2f;1,6;1,-w;1,1m;1,-c;1,-i;1,v;1,-a;1,-f;1,5;1,g;1,-1h;1,3k;1,-y;1,-b;1,z;1,1;1,k;1,-d;1,-a;1,-1;1,-o;1,1w;1,z;1,-b;1,-g;1w,-7;1,5d;1,-53;1,a;1,17;1,10;1,-s;1,9;1,-7;1,u;1,-1n;1,13;1,7;1,27;1,-2r;1,l;1,-11;1,7;1,i;1,1l;1,-f;1,l;1,-m;1,n;1,5;1,8;1,8;1,-9;1,t;1,h;1,9;1,-8;1,-d;1,-4;1,c;1,s;1,-8;1,m;1,f;1,e;1,-b20;1,b27;1,b;1,8;1,a;1,y;1,g;1,6;1,1;1,-v;1,1;1,16;1,-7;1,l;1,2;1,-m;1,p;1,9m;1,-ag;1,15;1,a;1,b;1,3;2,-d;1,-4;1,k;1,z;1,-c;1,2;1,-8;1,3;1,-8;1,m;1,-8;1,4;1,-k;1,h;1,16;1,b;1,-8;1,4;1,-m;1,4;1,-f;1,1y;1,-1;1,p;1,-18;1,2;1,12;1,-t;1,h;1,6;1,-l;1,-6;1,g;1,7;1,4b;1,-2r;1,-3;1,-t;1,19;1,s;1,-e;1,3;1,g;1,2yu;1,-2zv;1,p;1,-h;1,k;1,-1;1,-b;1,1g;1,3;1,-i;1,1b;1,-2;1,-f;1,-8;1,1;1,n;1,-1o;1,1r;1,5;1,-1;1,d;1,-1;1,g;1,5;1,3;1,-i;1,k;1,9;1,-2;1,g;1,7;1,5;1,4;1,9;1,m;1,-3;1,w;1,-15;1,8;1,1k;1,-1v;1,g;1,l;1,-5;1,s;1,-l;1,9;1,-l;1,n;1,c;1,f;1,-e;1,i;1,1;1,g;1,4;1,1;1,4;1,s;1,9;1,-6;1,-8;1,-c;1,a;1,i;1,8;1,-2;1,9;1,1c;1,-11;1,7;1,5;1,1;1,m;1,3;1,-9;1,-5;1,2;1,k;1,-1b;1,1v;1,-2;1w,8;1,-2;1,9;1,-3;1,5;1,5;1,3;1,7;1,5;1,5;1,2;1,9;1,5;1,9;1,8;1,-3;1,6;1,3;1,3;1,8;1,3;1,2;1,1;1,q;1,2;1,1;1,a;1,d;1,4;1,b;1,j;1,-6;1,-4;1,f;1,2;1,8;1,h;1,b;1,q;1,-9;1,-c;1,2;1,1g;1,-f;1,-1;1,-a;1,z;1,-3;1,2;1,10;1,-7;1,-g;1,k;1,1;1,-c;1,9;1,x;1,9;1,-b;1,o;1,h;1,8;1,-c;2,-3;1,d;1,z;1,-1g;1,2;1,l;1,-p;1,-3;1,1d;1,-5;1,j;1,-1l;1,1h;1,-6;1,7;1,9;1,j;1,2go;1,-2h1;1,5;1,j;1,-m;1,p;1,b;1,3;1,-1;1,-5;1,d;1,5;1,-1;1,h;1,-c;1,d;1,3;1,5;1,9;1,3;1,c;1,2;1,4;1,1;1,3;1,3;1,1;1,4g;1,7;1,-2;1,9;1,4;1,2;1,2;1,5;1,d;1,a;1,c;1,2;1,8;1,7;1,-4;1,5;1,3;1,1;1,6;1,-o;1,s;1,-8e3;1,8eo;1,-3;1,j;1,-b;1,1;1,-5;1,8;1,i;1,-7;1,z;1,-1;1,-9;1,z;1,-3;1,1;1,9;1,1;1,5;1,-3;1,8;1,-2;1,3;1,3lq;1,-3ln;1,-1y;1,1z;1,2;1,29;1,6;1,4;1,2;1,e;1,o;1,15;1,-4;1,-4;1,l;1,b;1,-4;1,-a;1,f;1,-g;1,v;1,1;1,-c;1,4;1,p;1,c;1,1;1,-a;1,u;1,1;1,-e;1,f;1,z;1,-d;1,-5;1,4;1,m;1w,-3;1,2;1,3;1,4;1,-8;1,h;1,b;1,-4;1,-1i;1,1l;1,-e;1,x;1,-4;1,a;1,5;1,6;1,-2;1,-1;1,7;1,-1;1,9;1,-2;1,3;1,5;1,h;1,-9;1,b;1,4;1,m;1,-l;1,d;1,7;1,3;1,3;1,g;1,8;1,p;1,-1;1,-g;1,j;1,c;1,-5;1,g;1,-3;1,7;1,-6;1,9;1,3;1,-4;1,-f;1,q;1,d;1,8;1,-2;1,c;1,-3;1,-4;1,e;1,-3;1,-3;1,8;1,9;1,5;2,6;1,1;1,1;1,1k;1,3;1,4;1,a;1,2;1,8;1,z;1,b;1,-3;1,8;1,5;1,48;1,-43;1,h;1,-c;1,1;1,n;1,4;1,c;1,-k;1,h;1,-8;1,-b;1,s;1,f;1,-1;1,4;1,-1t;1,2f;1,1;1,1;1,1;1,-1w;1,1n;1,-b;1,o;1,2;1,6;1,a;1,7;1,7;1,182;1,-186;1,g;1,-5;1,4;1,-1;1,a;1,-1;1,6;1,p;1,7;1,2;1,4;1,19;1,2;1,-97g;1,977;1,13;1,g;1,7;1,p;1,-2;1,q;1,c;1,2;1,b;1,2;1,4;1,a;1,-1;1,p;1,-2;1,-7;1,w;1,9;1,4;1,-5;1,b;1,-1;1,6;1,6;1,1;1,8;1,2;1,5;1,6;1,9;1,2;1,-6;1,x;1,-7;1,1;1,14;1,-v;1,l;1,o;1,-n;1,-4;1,25;1,-7;1,-i;1,4;1,r;1,-s;1,25;1,-2e;1,c;1,5;1,24;1,-6;1,-3;1,8;1,-1t;1,39;1,-m;1,-2;1,1e;1,12;1,-l;1,22;1,-m;1w,-l;1,9;1,-8;1,9;1,n;1,-5;1,6;1,x;1,4;1,s;1,-e;1,-o;1,2i;1,-4;1,1;1,-p;1,11;1,t;1,1;1,h;1,-3;1,-d;1,-l;1,q;1,-d;1,-8;1,s;1,1i;1,-6;1,-1;1,-g;1,4;1,9;1,12;1,-b;1,a;1,-k;1,p;1,7;1,h;1,-e;1,n;1,5;1,2;1,-4;1,c;1,-g1;1,g7;1,5;1,2;1,6;1,-z;1,y;1,2;1,3;1,-2;1,77;1,5;1,3;1,a;1,2;1,2;1,1;2,7;1,8;1,-1;1,6;1,f;1,-1;1,-2;1,5;1,c;1,-7h0;1,7gt;1,a;1,-1;1,9;1,-1;1,2;1,6;1,5;1,4;1,-3;1,1r;1,7;1,6;1,1;1,j;1,a;1,3;1,-4;1,18;1,-r;1,2;1,-1;1,2;1,7;1,c;1,-6;1,x;1,b;1,-3;1,2;1,j;1,-3;1,a;1,1;1,-2;1,4;1,2;1,2;1,1;1,l;1,-3;1,-2;1,4;1,-2o0;1,2of;1,1d;1,-1k;1,10;1,b;1,2;1,2;1,b;1,-5;1,3;1,-2;1,7;1,3;1,b;1,6;1,6;1,9;1,4;1,1;1,6;1,2;1,2;1,-6;1,7;1,j;1,4;1,4;1,2;1,2;1,-djq;1,djt;1,6;1,8;1,c;1,-9;1,5;1,-7;1,c;1,5;1,4;1,1;1,c;1,c;1,-2;1,-3;1,g;1,1;1,f;1,3;1,2;1,3;1,h;1,h;1,1gi;1,-1gd;1,-5qr;1,5qv;1,-1;1,q;1,-3;1,18;1,-k;1,-3;1,m;1,6;1,9;1,9;1,-4;1,w;1,4;1,1;1w,1;1,3;1,-1;1,1j;1,5;1,2;1,5;1,e;1,-1;1,3;1,z;1,2;1,o;1,6;1,9;1,2;1,4;1,9;1,-4;1,1;1,6;1,-4;1,c;1,2;1,f;1,1;1,4;1,7;1,-4;1,b;1,-5;1,6;1,1;1,-6;1,9;1,1u;1,1;1,d;1,8;1,1;1,e;1,z;1,-4;1,2;1,-5;1,-7;1,s;1,1;1,3;1,1;1,9;1,-3;1,9;1,e;1,-a;1,-z;1,1j;1,i;1,c;1,e;1,-3;1,-2;1,3;2,-5;1,n;1,-8;1,e;1,-4;1,8;1,3;1,3;1,-1;1,5;1,2;1,-1;1,1v;1,3;1,c;1,4;1,f;1,2;1,2;1,1;1,a;1,1;1,3;1,1;1,3;1,9;1,-4;1,3;1,6;1,-3;1,6;1,4;1,b;1,i;1,2;1,5;1,3;1,1;1,2;1,2;1,1;1,1;1,1;1,4;1,1;1,3;1,i;1,-1;1,c;1,-2;1,1;1,3;1,7;1,s;1,v;1,-g;1,e;1,5;1,1;1,8;1,1;1,8;1,c;1,c;1,a;1,-h;1,d;1,9;1,2;1,1;1,h;1,-1;1,2;1,-g;1,d;1,2h;1,-20;1,-1;1,-1;1,11;1,-1;1,-b;1,a;1,-7;1,-6;1,2;1,a;1,-8;1,-6;1,16;1,-j;1,a;1,-1;1,-3;1,f;1,n;1,-l;1,k;1,-8;1,s;1,6;1,7;1,f;1,2;1,33;1,5;1,4;1,p;1,-1;1,-t;1,o;1,3;1,10;1,-4;1,3t;1,-3w;1,-4;1,11;1,-1b;1,-3;1,1b;1,-2;1,-1;1,8;1,2;1w,l;1,1;1,6;1,-j;1,-1;1,9;1,p;1,n;1,-2;1,10;1,-1o;1,b;1,w;1,a;1,5;1,9;1,i;1,-3;1,-6;1,-3;1,2;1,c;1,9;1,-d;1,n;1,-6;1,11;1,-i;1,7;1,2;1,e;1,t;1,1;1,3;1,2f;1,4;1,4;1,4;1,7;1,3;1,1;1,6;1,3;1,-4;1,c;1,8;1,4;1,f;1,-e;1,3;1,-1fw;1,1gr;1,2;1,1;1,1;1,4;1,8;1,2;1,-1;1,3;1,5;1,3;1,7;2,5;1,2;1,1;1,2;1,2;1,1;1,1;1,a;1,1;1,-7yp;1,7z2;1,c;1,b;1,i;1,c;1,8;1,2;1,f;1,-4;1,1;1,1;1,5;1,1;1,5;1,-2;1,d;1,-5;1,4;1,v;1,7;1,4;1,-e41;1,3h4;1,7ma;1,-5it;1,-6tk;1,69p",
	BIG5: "vuo,9hc;1,14wc;1,-14wb;1,1;1,14wc;1,-1818;1,181l;1,-1;1,5;1,-u;1,-5t;1,-17uy;1,-1;1,17vv;1,7o;1,-7m;1,-1e3f;1,1e3h;1,1;1,1;1,1;1,79;1,-183t;1,17vi;1,-17vh;1,17vj;1,cq;1,-cp;1,r;1,55;1,1;1,-5w;1,1;1,85;1,2;1,-86;1,1;1,-14pw;1,1;1,14pw;1,1;1,-14q2;1,1;1,14q2;1,1;1,-14qa;1,1;1,14qa;1,1;1,-14qe;1,1;1,14qe;1,1;1,-14qc;1,1;1,14qc;1,1;1,-14qc;1,1;1,14qc;1,1;1,l;1,1;z,1;1,1;1,1;1,1;1,-17wm;1,1;1,3;1,1;1,35s;1,1;1,-355;1,-3;1,180h;1,3;1,4;1,-180f;1,-68k;1,9cs;1,-20o;1,4;1,-s;1,-1;1,s;1,1k;1,-1;1,-1q;1,-1;1,-11;1,-1;1,t;1,-1;1,2jr;1,-3ha;1,-5j;1,1873;1,-5a;1,5a;1,-c4;1,1;1,3;1,1;1,-3;1,1;1,j;1,1;1,1;1,4q;1,2;1,-1e7q;1,w;1,-1y;1,6ll;1,17nm;1,2;1,-1;1,-17lj;1,1;1,-7;1,-1u;1,1g;1,f;1,17gh;1,1;1,1;1,1;1,1;1,-17hm;1,-j;1,1;1,3f;1,-3p;1,-1;1,4g;1,3df;1,-1;1,-3hi;1,3;1,7;1,-1;1,ss;1,2;1,-1;1,-1k;1,-vs;1,2;1,-3;1,2;1,4;1,1;1,2;1,-1;1,3x;1,-2;1,17tm;1u,0;1,-6m;1,19;1,-1k;1,-1e8v;1,9d9;1,-9dc;1,1;1,1e8y;1,r;1,-17vh;1,6;1,17q8;1,1;1,1;1,-140m;1,-1l;1,1;1,1;1,1c;1,-19;1,-j;1,1;1,1h;1,-a38;1,fxl;1,2;1,3;1,-1;1,4;1,2;1,w4;1,64i;1,1k5;1,-h8t;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,7;1,-1;1,-1;1,-1;1,-1;1,-1;1,-1;1,-25;1,-8;1,-8;1,-8;1,-8;1,3c;1,-44;1,2;1,43;1,-3t;1,4;1,4;1,4;1,2d;z,1;1,2;1,-1;1,-v;1,e;1,c;1,-9;1,3l;1,1;1,2;1,-1;1,-37;1,1;1,1;1,16zh;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-17sp;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2wo;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,151w;1,-y49;1,y49;1,-64;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,7;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1u,1;1,1;1,1;1,1;1,-1dqh;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,8;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,8xo;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;z,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-95c;1,-g;1,1;1,-3;1,4;3l,eut;1,2h;1,-2g;1,2;1,1s;1,q;1,15;1,6;1,1a;1,hx;1,12;1,6;1,39;1,w;1,1;1,4a;1,3e;1,18;1,r;1,30;1,-14v;1,2;1,-3;1,2;1,x;1,d;1,q1;1,-po;1,3;1,n;1,-1;1,1c;1,j;1,in;1,5f;1,6v;1,21;1,3q;1,q;1,n0;1,cs;1,16;1,i;1,24;1,d9;1,1;1,2;1,4l;1,n;1,j;1,m;1,1l;1,a4;1,8;1,c;1,1;1,1;1,b;1,38;1,3w;1,d;1,8;1,my;z,-3zw;1,-1;1,-3;1,w;1,3;1,9;1,i;1,2r2;1,-2pd;1,9;1,4;1,-3;1,2;1,e;1,v;1,-1;1,3;1,3;1,1;1,6;1,-3;1,1;1,-7;1,hr;1,-2;1,12;1,6;1,1;1,-2;1,17;1,2n;1,g;1,1;1,1;1,6r;1,3;1,1;1,n;1,z;1,f;1,-1;1,-2;1,p;1,12;1,1z;1,-1;1,3;1,10f;1,1p;1,2;1,-1;1,3;1,fb;1,59;1,j;1,m;1,1h;1,at;1,3r;1,3o;1,l;1,1;1,4u;1,g5;1,1a;1,l;1,3;1,kh;1,2g;1,g;1,d;1,l;1,18;1,7f;1,o;1,w;1,s8;1,1u;1,n;1,2a;1,9;1,7;1,1g;1,11;1,tz;1,cf;1,c;1,5;1,c;1,i;1,2;1,29;1,67;1,-7ea;1u,-3;1,-1;1,-1;1,4;1,z;1,i;1,2;1,-1;1,47;1,-d;1,-4;1,1;1,1;1,1;1,c;1,1;1,-b;1,5;1,h3;1,-1;1,1x;1,1;1,y;1,25;1,1;1,-2;1,i;1,46;1,-1;1,2u;1,1;1,h;1,6;1,-u6;1,vf;1,-1;1,o;1,-1;1,f;1,-1;1,25;1,1g;1,-b;1,f;1,-7;1,2;1,-5;1,-1;1,k;1,-4;1,-3;1,-a;1,-5;1,4;1,8;1,-1;1,-1;1,-b;1,8;1,e;1,kg;1,-1;1,fw;z,o;1,3;1,1v;1,2;1,db;1,1a;1,55;1,bw;1,-1;1,-1;1,s;1,1;1,34;1,9;1,3p;1,n;1,-1;1,4u;1,g5;1,21;1,1;1,-2;1,-1;1,no;1,1t;1,94;1,-2;1,-2;1,1;1,2;1,ty;1,2y;1,1w;1,-1;1,14;1,9;1,-1;1,-2;1,19t;1,5x;1,5;1,9f;1,a;1,1e;1,7;1,9;1,1;1,7;1,1;1,1;1,1;1,2g;1,6q;1,1d;1,h;1,1b;1,6l;1,7;1,h;1,93;1,3o;1,52;1,2f;1,-8tp;1,1;1,1f;1,1;1,m;1,1c;1,b;1,2;1,-1;1,2i;1,a;1,g;1,-f;1,b;1,-8;1,3;1,1;1,-2;1,-t;1,4;1,5;1,-b;1,3;1,a;1,4;1,a;1,fy;1,-2;1,-1;1,2;1,w;1u,9;1,s;1,z;1,2v;1,-6;1,1;1,-4;1,8;1,3x;1,2t;1,p;1,-1;1,28;1,1;1,48;1,6;1,-3;1,-2;1,6;1,-f;1,a;1,-7;1,d;1,-4;1,-5;1,-5;1,b;1,-8;1,c;1,jy;1,-2;1,-1;1,2e;1,-3;1,-8;1,5;1,-1;1,3;1,-6;1,ds;1,1;1,t;1,1;1,24;1,-c;1,b;1,-6;1,-4;1,9;1,-1;1,d2;1,1;1,1b;1,1;1,-3;1,4;1,35;1,s;1,2r;1,9x;1,14;1,34;1,-2;z,4b;1,c;1,5a;1,-3;1,fs;1,-2;1,1;1,3;1,2b;1,-8;1,-3;1,ke;1,4z;1,-1;1,4;1,1;1,79;1,1;1,m;1,1g;1,-9;1,-3;1,4;1,rw;1,1v;1,n;1,4b;1,1z;1,-6;1,2;1,6;1,1;1,-g;1,5;1,c;1,-6;1,-e;1,1;1,te;1,dr;1,-2;1,td;1,vv;1,ai;1,3p;1,fy;1,2c;1,1f;1,1w;1,2;1,9;1,6;1,x;1,24;1,a;1,2;1,1;1,9j;1,7;1,9;1,9;1,g;1,f;1,4;1,27;1,4;1,c;1,rx;1,d1;1,c;1,n;1,7w;1,2hu;1,-e7j;1,3a;1,4l;1,2;1,-8;1,g;1,7;1,-16;1,13;1,-6;1,-11;1,w;1,1;1,-k;1,-3;1,-2;1,b;1,h;1,-o;1,a;1,t;1u,-7;1,4;1,-1d;1,v;1,-o;1,z;1,4;1,-l;1,i;1,du;1,-1;1,2;1,14;1,1t;1,1;1,32;1,-1;1,5;1,1;1,-2;1,3n;1,-2;1,1;1,2;1,3b;1,28;1,2;1,4o;1,g;1,-f;1,w;1,-o;1,14;1,-13;1,v;1,-3;1,-g;1,l;1,-6;1,-13;1,e;1,x;1,-h;1,2;1,-3;1,-a;1,7;1,1;1,-m;1,s;1,4;1,-f;1,-6;1,-c;1,d;1,ji;1,6;1,-c;1,7;1,2n;1,7;1,-h;1,d;z,-6;1,7;1,-g;1,i;1,-1;1,-k;1,c4;1,27;1,2n;1,-b;1,m;1,-a;1,5;1,-a;1,-3;1,-9;1,n;1,-h;1,-9;1,r;1,c8;1,-1;1,-2;1,1;1,1d;1,-1;1,4;1,4d;1,k;1,1;1,-2;1,-1;1,2a;1,1;1,3;1,-8;1,9r;1,x;1,3n;1,-8;1,3;1,31;1,d;1,r;1,1x;1,-2;1,l;1,2;1,2n;1,-c;1,b;1,-a;1,10;1,-6;1,d;1,-e;1,fc;1,-1;1,37;1,j;1,-1;1,-m;1,-a;1,j;1,-s;1,t;1,-e;1,2;1,-5;1,-6;1,v;1,-z;1,15;1,-16;1,13;1,-2;1,-2;1,-b;1,j7;1,2;1,-3;1,55;1,77;1,2z;1,-h;1,1;1,1;1,1;1,b;1,-6;1,8;1,-l;1,-3;1,q;1u,-d;1,4;1,su;1,2y;1,37;1,s;1,1n;1,-o;1,7;1,1;1,-4;1,m;1,-1d;1,g;1,m;1,-w;1,s;1,-10;1,1a;1,-4;1,-l;1,6;1,-h;1,c;1,-a;1,i;1,-g;1,n;1,7;1,4;1,-m;1,s4;1,6;1,1;1,-5;1,dm;1,-1;1,-1;1,2s;1,-2;1,5w;1,ba;1,-1;1,c;1,1;1,96;1,31;1,6s;1,da;1,-1;1,-1;1,53;1,hx;1,gq;1,8x;1,-3;1,a;1,-5;1,3;1,-1;1,o;1,cd;1,z;z,-7;1,2;1,1dq;1,1z;1,1a;1,fr;1,f;1,f;1,20;1,5j;1,c;1,1v;1,6w;1,v;1,5t;1,l;1,i;1,4;1,-1;1,-1;1,-9ur;1,a0g;1,h;1,8;1,-4;1,-3;1,4m;1,3h;1,6;1,va;1,-4;1,3;1,-7;1,2;1,-e86;1,1c;1,t;1,o;1,g;1,3;1,d;1,1;1,5f;1,1a;1,-g;1,-q;1,c;1,-j;1,1b;1,-g;1,-5;1,-3;1,-j;1,5;1,j;1,-v;1,i;1,r;1,-o;1,h;1,2;1,-n;1,d6;1,-2;1,3;1,k;1,e;1,-1;1,2;1,1x;1,1s;1,1q;1,-3;1,-1;1,3;1,-a;1,-2;1,8;1,b;1,3h;1,-3;1,47;1,2;1,-1;1,-2;1,l;1,h;1,1;1,1;1,2l;1,-2;1,3;1,4c;1,2;1u,x;1,-u;1,t;1,-l;1,-5;1,-4;1,d;1,e;1,-c;1,-a;1,k;1,-v;1,5;1,m;1,e;1,-1k;1,6;1,z;1,-e;1,h;1,h8;1,3t;1,-c;1,-d;1,-1;1,-8;1,5;1,-2;1,o;1,bk;1,19;1,-2;1,1;1,-4;1,g;1,2y;1,-3;1,p;1,-r;1,-b;1,z;1,-b;1,a;1,-3;1,-2;1,8;1,-9;1,-r;1,4;1,v;1,-d;1,be;1,5;1,-1;1,1g;1,3;1,-2;1,4;1,-3;1,2;1,3j;1,1a;1,-3;z,1;1,35;1,-m;1,n;1,-f;1,2;1,6;1,2;1,9x;1,2;1,-4;1,-1;1,6;1,-a;1,2v;1,y;1,-3;1,5;1,-7;1,1;1,2o;1,1c;1,1;1,2;1,2f;1,1;1,-2;1,-3;1,2p;1,3;1,t;1,-8;1,a;1,g;1,5;1,r;1,6;1,-v;1,k;1,-l;1,c;1,6;1,2;1,2;1,-g;1,e3;1,-1;1,16;1,-1;1,2;1,1r;1,22;1,3;1,-8;1,-5;1,3;1,-9;1,p;1,9;1,-1c;1,14;1,1;1,-9;1,-3;1,-w;1,l;1,-1;1,k;1,9;1,-i;1,6;1,-o;1,11;1,-15;1,13;1,-2;1,1;1,-h;1,-q;1,y;1,hc;1,2x;1,l;1,1q;1,q;1,-1;1,-7;1,-6;1,-4;1,c;1,-e;1,f;1,6;1,-b;1u,-3;1,7a;1,-2;1,2q;1,u;1,a;1,-10;1,17;1,-15;1,4;1,g;1,m;1,-6;1,-14;1,1;1,f;1,a;1,-b;1,i;1,-r;1,11;1,-7;1,-n;1,-i;1,8;1,q9;1,1v;1,1;1,o;1,44;1,8;1,5k;1,5;1,b;1,-1u;1,r;1,p;1,-1e;1,a;1,1;1,-2;1,12;1,-1j;1,16;1,-2;1,-r;1,c;1,-b;1,8;1,-j;1,15;1,-i;1,18;1,-1e;1,-4;1,12;1,-6;1,-h;1,-u;1,1v;1,-j;1,-6;1,a;z,qd;1,-7;1,4;1,-8;1,f;1,b7;1,1;1,b;1,g;1,v;1,2;1,2f;1,e;1,b;1,-2;1,-7;1,61;1,-1;1,-9;1,c;1,-6;1,bc;1,2o;1,-4;1,1;1,6i;1,1q;1,1c;1,2;1,6p;1,o;1,8x;1,2;1,1;1,3s;1,-1;1,4y;1,-1;1,3l;1,ec;1,gm;1,1k;1,-1;1,3e;1,51;1,-l;1,-3;1,f;1,-g;1,a;1,-2;1,b;1,-a;1,5;1,8m;1,p;1,f;1,4m;1,-m;1,-4;1,k;1,g;1,-u;1,q;1,-8;1,-5;1,-7;1,a;1,9;1,-l;1,d;1,e;1,-7;1,pj;1,z;1,-ac4;1,aq3;1,19f;1,77;1,6;1,-3;1,6c;1,3;1,-7;1,5;1,7l;1,a;1,py;1,9;1,4c;1,10;1,-1;1,-4;1,9;1u,-2;1,3b;1,1b;1,2y;1,c;1,-edb;1,e;1,1;1,8j;1,-18;1,-6;1,g;1,x;1,-f;1,-2;1,e;1,-q;1,-d;1,y;1,7;1,-l;1,d;1,-15;1,y;1,-c;1,-2;1,o;1,-c;1,g;1,-13;1,bk;1,1n;1,-1;1,f;1,4u;1,-b;1,7;1,3;1,-1;1,-1;1,-4;1,3k;1,2;1,-6;1,-2;1,24;1,22;1,10;1,v;1,1t;1,5t;1,k;1,-o;1,12;1,-5;1,-h;1,-i;1,d;1,k;1,-5;1,-5;1,-j;1,n;z,3;1,4;1,-p;1,-4;1,6;1,a;1,-i;1,-2;1,o;1,g0;1,3n;1,9;1,l;1,3;1,-1;1,18;1,-w;1,-r;1,ci;1,-4;1,-2;1,-1;1,2;1,3w;1,-4;1,13;1,-s;1,5;1,r;1,-u;1,5;1,-g;1,c;1,r;1,-6;1,a6;1,1m;1,3;1,-2;1,-2;1,3;1,2k;1,25;1,1;1,-2;1,-2;1,3y;1,-7;1,85;1,12;1,8;1,-6;1,2m;1,z;1,6;1,2c;1,e;1,11;1,1k;1,z;1,-3;1,5;1,1;1,-4;1,5;1,-3;1,3t;1,b;1,3;1,5;1,-n;1,q;1,11;1,z;1,-8;1,-6;1,-s;1,-3;1,15;1,-1;1,-1;1,-6;1,d9;1,4b;1,1m;1,-d;1,-d;1,-f;1,k;1,-j;1,f;1,a;1,-m;1,6;1u,-8;1,-3;1,i;1,-a;1,t;1,-f;1,fx;1,6;1,2u;1,i;1,11;1,1v;1,8;1,-d;1,7;1,8;1,-g;1,9;1,9;1,-d;1,5v;1,7c;1,-18;1,u;1,-t;1,-4;1,s;1,-1i;1,-7;1,1y;1,-c;1,6;1,-17;1,d;1,-t;1,12;1,b;1,-19;1,n;1,f;1,l;1,-1v;1,15;1,9;1,-5;1,-b;1,pk;1,p;1,3;1,1b;1,t;1,5;1,20;1,4q;1,1u;1,13;1,-8;1,n;1,-s;1,-p;1,11;1,-j;1,-7;z,10;1,2;1,1;1,-8;1,-r;1,-12;1,1w;1,-i;1,h;1,-f;1,5;1,7;1,-13;1,t;1,ow;1,f;1,-7;1,-7;1,3;1,-2;1,b;1,-a;1,-a;1,b0;1,1u;1,-3;1,5;1,39;1,-9;1,1;1,5y;1,j;1,-f;1,-9;1,r;1,-d;1,-d;1,9z;1,j;1,y;1,-3;1,2;1,-3;1,2o;1,-7;1,1;1,-3;1,1;1,5x;1,e;1,1;1,1;1,1s;1,-2;1,-3;1,2;1,1o;1,-8;1,-1;1,h;1,2;1,-d;1,-2;1,b;1,5x;1,12;1,i;1,-8;1,1;1,8p;1,3;1,-1;1,-1;1,36;1,1;1,n;1,1;1,-7;1,50;1,2;1,3i;1,-2;1,ao;1,3p;1,3;1,-5;1,9;1,-2;1,-3;1,2;1,fm;1,2e;1,1d;1,1x;1u,c;1,-3;1,4;1,11;1,4g;1,f;1,-b;1,-n;1,1;1,8;1,l;1,-6;1,-d;1,g;1,6;1,-7;1,7r;1,1a;1,5h;1,s;1,2;1,-y;1,-8;1,b;1,u;1,-v;1,t;1,7;1,-1j;1,5;1,q;1,g;1,-11;1,-8;1,-3;1,d;1,-b;1,c;1,g;1,n;1,ne;1,15;1,2;1,-1;1,cz;1,u;1,7q;1,2b;1,1g;1,-6;1,1;1,ij;1,2;1,5w;1,-1;1,1t;1,7t;1,-1;1,84;1,-a;1,-4;1,8;1,-5;z,8;1,-2;1,-7;1,4;1,6a;1,4;1,-d;1,2;1,3s;1,-1;1,3n;1,qd;1,5q;1,-5;1,1;1,1;1,7p;1,7;1,2q;1,y;1,6;1,e;1,4n;1,1f;1,4;1,53;1,3;1,-ev5;1,2j;1,9l;1,1;1,m;1,-1g;1,1j;1,-1;1,-19;1,1d;1,-j;1,-g;1,1i;1,-t;1,-5;1,-8;1,-1;1,-n;1,6;1,k;1,k;1,-1j;1,1c;1,-m;1,e;1,-1;1,-11;1,-5;1,1r;1,-3;1,-18;1,19;1,-y;1,ab;1,14;1,1;1,-3;1,17;1,-1;1,-6;1,5;1,3v;1,6;1,-8;1,7;1,2;1,5p;1,2d;1,w;1,-2;1,1u;1,7d;1,14;1,-f;1,1i;1,-1n;1,-n;1,d;1,k;1,-c;1,q;1,-17;1,4;1,-c;1,14;1,-r;1,-4;1u,-4;1,1t;1,-w;1,-a;1,i;1,dw;1,1;1,5a;1,i;1,-9;1,-8;1,1y;1,7a;1,20;1,1;1,2;1,53;1,7;1,4;1,3;1,-4;1,-8;1,-13;1,1g;1,3;1,6;1,-4;1,-p;1,-3;1,9u;1,6l;1,-4o;1,3;1,3;1,-2;1,-6;1,7;1,4;1,-1;1,24;1,25;1,4;1,-5;1,4d;1,g;1,-2;1,-h;1,-2;1,8;1,6;1,b;1,-d;1,6y;1,1r;1,-2;1,3k;1,2;1,-6;1,3u;1,2p;1,-1;1,-1;1,5l;z,a;1,2;1,-l;1,5;1,o;1,-4;1,6;1,l;1,r;1,-5;1,-d;1,7;1,-8;1,-7;1,h;1,c1;1,4s;1,l;1,-9;1,27;1,-g;1,-f;1,12;1,-j;1,4;1,9;1,-6;1,-f;1,m;1,-j;1,-j;1,1;1,-3;1,11;1,-1;1,e4;1,1;1,28;1,14;1,4;1,3h;1,7;1,6;1,-c;1,f;1,-6;1,-7;1,-4;1,53;1,s;1,1;1,2;1,7e;1,n;1,g;1,-2;1,d;1,-q;1,9;1,i;1,-17;1,3u;1,-4c;1,1h;1,5;1,-k;1,-21;1,2k;1,-g;1,-4;1,7;1,-p;1,r;1,-1e;1,5;1,15;1,nd;1,-1;1,1a;1,30;1,4;1,1;1,-2;1,-2;1,5o;1,3e;1,17;1,-d;1,-1;1,-x;1,i;1,-1;1,-u;1,1m;1u,-13;1,t;1,-r;1,-k;1,q;1,-b;1,z;1,-2;1,-h;1,c;1,-w;1,1b;1,mu;1,e;1,c;1,-b;1,-h;1,7;1,a2;1,1s;1,3n;1,-3;1,4;1,-5;1,-1;1,3z;1,2v;1,s;1,-r;1,-e;1,a;1,-c;1,ae;1,9;1,-1;1,-2;1,-1;1,2t;1,7;1,2;1,-l;1,1;1,a;1,-1;1,-3;1,9;1,-a;1,5v;1,11;1,q;1,3;1,1;1,2j;1,-a;1,1;1,8;1,5d;1,1z;1,-9;1,h;1,-r;1,n;1,3;z,-i;1,8;1,-d;1,-1;1,j;1,83;1,-5;1,g;1,-1;1,-9;1,8;1,-1;1,-6;1,3;1,3u;1,-1;1,4;1,-8;1,7;1,3;1,-h;1,4s;1,4;1,29;1,19;1,b;1,ag;1,48;1,-a;1,-c;1,-1;1,m;1,2;1,-e;1,-4;1,5;1,5;1,2;1,-f;1,c;1,2;1,f3;1,11;1,1h;1,1d;1,-4;1,1x;1,i;1,-3;1,4;1,-2;1,12;1,2;1,4y;1,h;1,-i;1,l;1,-o;1,7;1,i;1,-e;1,-5;1,l;1,-b;1,d;1,-e;1,-d;1,72;1,-1;1,k;1,g;1,q;1,1;1,-3;1,4;1,3z;1,34;1,13;1,2;1,-a;1,-i;1,o;1,-7;1,-k;1,-1;1,r;1,-t;1,7;1,-3;1,-v;1,15;1,-f;1,-9;1,r;1u,lt;1,1i;1,w;1,-n;1,h;1,5;1,-t;1,n;1,-7;1,d0;1,7;1,a;1,1;1,-5;1,-4;1,bj;1,-8;1,-2;1,-2;1,9;1,-b;1,d;1,-4;1,3;1,-7;1,2;1,fr;1,1e;1,-1;1,14;1,1;1,5x;1,8l;1,12;1,2;1,-5;1,6a;1,28;1,5;1,-f;1,9;1,-6;1,-6;1,f;1,-6;1,8;1,-d;1,4d;1,24;1,-4;1,5;1,34;1,-5;1,-1;1,3w;1,5;1,-6;1,5;1,-3;1,q2;1,67;1,1;1,-2;z,-6;1,2;1,7;1,-c;1,6;1,2l;1,fb;1,5m;1,70;1,1c;1,25;1,d;1,a;1,-f5q;1,e4;1,3;1,-x;1,-l;1,-4;1,9;1,e;1,-h;1,s;1,h;1,-14;1,7;1,w;1,-1;1,3;1,-14;1,-1s;1,2o;1,-2;1,6n;1,1l;1,2j;1,3e;1,5;1,2r;1,7;1,-1;1,-3;1,1n;1,-1;1,a;1,12;1,1;1,-2;1,3p;1,3sp;1,-3hy;1,10;1,-4;1,-y;1,q;1,3;1,-u;1,7;1,-p;1,11;1,-7;1,6;1,-12;1,1h;1,-18;1,-a;1,1a;1,-1c;1,1j;1,-1c;1,e;1,m;1,c1;1,3;1,-2;1,5y;1,12;1,5;1,-4;1,-12;1,4;1,m;1,8;1,1f;1,-1q;1,2;1,87;1,1u;1,5w;1,b;1,8;1,t;1,4;1,-16;1u,-4;1,12;1,-8;1,-k;1,4;1,86;1,2f;1,-2;1,-1;1,-2;1,-3;1,7;1,1v;1,-1;1,-1;1,2h;1,-4;1,1;1,4q;1,-1;1,8;1,d;1,-5;1,c;1,-h;1,o;1,-l;1,5;1,b;1,3;1,-g;1,5n;1,2e;1,-2;1,-3;1,4;1,3k;1,1;1,-2;1,-1;1,9;1,3b;1,2;1,w;1,l;1,-3;1,2;1,18;1,2;1,5;1,-6;1,9;1,-1;1,-4;1,6b;1,10;1,-q;1,n;1,8;1,z;1,-n;1,1e;1,-15;z,8;1,-a;1,-6;1,13;1,-w;1,s;1,-3;1,-f;1,p;1,-13;1,y;1,-j;1,9f;1,1;1,19;1,9k;1,7;1,-1h;1,10;1,c;1,3;1,-1a;1,-g;1,1d;1,i;1,-1l;1,1k;1,-w;1,-6;1,o;1,-1c;1,1p;1,-10;1,4;1,h;1,8;1,b;1,-q;1,-3;1,-f;1,-5;1,-i;1,-1;1,i;1,df;1,-7;1,-5;1,8;1,-2;1,-35k;1,35c;1,9;1,-3;1,-1;1,20;1,-1;1,h;1,z;1,-4;1,1;1,2;1,3z;1,-3;1,a;1,4;1,-2;1,-8;1,4b;1,-3z6;1,404;1,9y;1,1a;1,-d;1,-f;1,y;1,-1i;1,-9;1,1n;1,-a;1,-g;1,p;1,-19;1,1t;1,-n;1,-13;1,-1;1,f;1,9;1,b;1,-9;1,2;1,-v;1,j4;1,3s;1u,1d;1,1;1,1r;1,9v;1,1a;1,1j;1,-q;1,-13;1,1b;1,-l;1,o;1,n;1,-1;1,b;1,-1q;1,4;1,-s;1,y;1,-z;1,1c;1,r;1,-1t;1,1r;1,-2;1,-1c;1,d;1,20;1,-2t;1,11;1,h;1,-j;1,i;1,7;1,-3;1,-6;1,-y;1,-2;1,-q;1,1u;1,-19;1,13;1,lv;1,g;1,1;1,-d;1,-e;1,9a;1,1s;1,4;1,4b;1,-1;1,-5;1,-3;1,6;1,32;1,3i;1,5;1,-7;1,3;1,-8;1,f;1,5v;1,m;z,1;1,11;1,6;1,1v;1,1;1,-4;1,e;1,v;1,1x;1,1;1,-w;1,l;1,3;1,5d;1,1y;1,-2;1,9;1,2k;1,7;1,-2;1,-6;1,2;1,2;1,8h;1,-14;1,b;1,7r;1,3;1,5;1,3y;1,47;1,3;1,3v;1,8;1,-d;1,h;1,-6;1,-d;1,5;1,g;1,9w;1,5;1,-2;1,4x;1,-3;1,1a;1,-1v;1,b;1,3;1,4;1,-g;1,3;1,h;1,-l;1,j;1,-g;1,-1;1,ek;1,2p;1,-4;1,1e;1,2;1,4;1,22;1,1a;1,-4;1,6h;1,-p;1,d;1,8;1,-2;1,7;1,-c;1,66;1,1f;1,2;1,-1;1,3;1,9h;1,g;1,-6;1,-w;1,16;1,-c;1,13;1,-i;1,-p;1,-8;1,9;1,-a;1,n;1,-15;1,4;1,1;1u,a;1,x;1,j2;1,-7or;1,7rx;1,-7;1,-a;1,e;1,-f;1,h;1,5;1,-q;1,-2;1,q;1,ay;1,23;1,-m;1,z;1,-p;1,4;1,-9;1,-2;1,7c;1,-4;1,4b;1,-d;1,6;1,2;1,c;1,-4;1,-e;1,-4;1,7;1,fb;1,h;1,27;1,3;1,-1;1,-3;1,2;1,-3;1,5c;1,-1;1,2g;1,-4;1,81;1,4;1,8q;1,-c;1,d;1,-3;1,c;1,-4;1,-2;1,-d;1,5;1,9;1,2;1,-h;1,j;1,-c;1,5;1,-7;z,5w;1,5;1,g;1,2i;1,3b;1,13;1,-f;1,-3;1,4;1,6;1,-4;1,ps;1,69;1,b;1,-2;1,5;1,-8;1,4;1,2;1,1;1,-b;1,2c;1,16;1,-1;1,-5jd;1,-1;1,5r7;1,1;1,nr;1,az;1,b4;1,a;1,12;1,m;1,-ffd;1,-l;1,-8;1,k;1,-8;1,-h;1,m;1,2;1,2;1,4fa;1,-45r;1,3l;1,2;1,1;1,-c;1,39;1,-1;1,-2;1,3j;1,23;1,d2;1,5;1,13;1,-17;1,e;1,j;1,-5;1,-m;1,q;1,e;1,-m;1,-d;1,4;1,-8;1,1c;1,-5;1,-f;1,-2p;1,38;1,-o;1,x;1,-f;1,5;1,-1f;1,b;1,y;1,-i;1,ac;1,82;1,-5;1,a;1,-g;1,c;1,1;1,-g;1,-4;1,3;1,61;1,1;1,2u;1u,7r;1,z;1,-r;1,j;1,9;1,c;1,5o;1,-2;1,2p;1,-6;1,7;1,-3;1,1m;1,1;1,12;1,7v;1,4;1,-s;1,j;1,52;1,20;1,-8;1,3;1,3;1,1n;1,24;1,-9;1,1;1,2;1,3c;1,1d;1,1o;1,1;1,-2;1,89;1,g;1,-1b;1,4;1,16;1,1o;1,7;1,-15;1,r;1,-11;1,b;1,-7;1,38;1,-3b;1,t;1,-o;1,j;1,-9;1,i;1,7h;1,16;1,9m;1,-n;1,1v;1,-f;1,15;1,-w;1,-3;1,7;z,5;1,h;1,-j;1,h;1,-b;1,n;1,1;1,-3c;1,3i;1,-a;1,-f;1,3b;1,-3c;1,v;1,9x;1,8;1,-4;1,1;1,1a;1,-1;1,v;1,5b;1,2;1,4;1,2;1,-7;1,y;1,-n;1,4;1,-7;1,3r;1,1;1,w;1,-2;1,d9;1,-11;1,b;1,-8;1,-1;1,1a;1,-12;1,m;1,-7;1,-7;1,i;1,-13;1,w;1,-f;1,-o;1,2;1,1s;1,5;1,-4;1,-1x;1,h;1,44;1,-37;1,g3;1,-4;1,3;1,2j;1,-2;1,12;1,1f;1,1r;1,1;1,-3;1,eb;1,9;1,s;1,-1f;1,h;1,1h;1,-t;1,-16;1,5;1,-2;1,-8;1,1s;1,-3;1,-1g;1,1e;1,o;1,-1t;1,-7;1,21;1,-1n;1,p;1,-j;1,-e;1,n;1,-12;1,x;1,3x;1u,-1u;1,-34;1,1h;1,l;1,-v;1,1a;1,-9;1,-a;1,je;1,1;1,c;1,a;1,-f;1,l;1,1k;1,-2a;1,8g;1,1k;1,-4;1,52;1,-h;1,f;1,-b;1,7l;1,-g;1,9;1,-h;1,3;1,g;1,1;1,-2;1,-5;1,-k;1,b;1,2;1,71;1,1;1,1x;1,-1;1,3c;1,-7;1,8;1,-a;1,-1;1,6;1,2;1,4b;1,1;1,q;1,-3;1,x;1,14;1,37;1,4e;1,34;1,f;1,3;1,bi;1,-5;1,3;1,-6;1,-5;1,48;z,-1;1,-1;1,27;1,-2;1,2u;1,d;1,-g;1,a;1,2;1,2;1,-7;1,-2;1,4;1,2;1,9a;1,6;1,55;1,-e;1,o;1,-j;1,-16;1,1v;1,4;1,-h;1,5;1,-4;1,e;1,3;1,-7vz;1,8cw;1,1;1,1i;1,1z;1,1f;1,5s;1,-1;1,-9;1,6;1,-3;1,-l;1,d;1,-8;1,e;1,7;1,x;1,4e;1,a;1,ct;1,q;1,-b;1,l;1,-19;1,-r;1,1y;1,-22;1,1a;1,2;1,3;1,2r;1,-25;1,-q;1,s;1,-1s;1,1d;1,-b;1,-14;1,32;1,-16;1,-a;1,-14;1,17;1,-1f;1,b;1,ho;1,3o;1,-6;1,k;1,-p;1,7;1,9;1,-k;1,e;1,ah;1,2y;1,1;1,-h;1,5u;1,j;1,4l;1,11;1,-b;1,9;1,-y;1,5;1u,j;1,7;1,-b;1,-a;1,-i;1,6;1,-4;1,w;1,ej;1,x;1,19;1,d;1,-9;1,a;1,4;1,-6;1,5;1,-c;1,3;1,-1;1,9;1,-7;1,5u;1,-5;1,-4;1,25;1,f;1,-i;1,f;1,-9;1,-5;1,f;1,-l;1,8l;1,-3;1,4;1,4g;1,42;1,7;1,-4;1,7;1,-6;1,4;1,5o;1,-d;1,k;1,-b;1,2t;1,2;1,2y;1,1x;1,1;1,e;1,-q;1,l;1,-h;1,3;1,-9;1,a;1,oz;1,-5;1,-4;1,6;z,2;1,-1;1,-4;1,70;1,4;1,-3;1,-e;1,8;1,1;1,7;1,-r;1,i;1,1p;1,4;1,-1;1,2;1,1;1,14;1,3;1,62;1,1l;1,1;1,2;1,67;1,3;1,5;1,-6;1,9;1,-5;1,5d;1,-1;1,106;1,a;1,4;1,-fv3;1,ff;1,8;1,-3;1,1;1,i;1,-7;1,-i;1,b;1,4;1,-c;1,o;1,c8;1,-8;1,6;1,2q;1,7;1,-2;1,-2;1,1;1,24;1,j4;1,9;1,-l;1,j;1,-o;1,e;1,-l;1,a;1,i;1,1;1,b;1,-l;1,7;1,-s;1,1;1,v;1,-s;1,95;1,1;1,97;1,-d;1,7;1,-1;1,3;1,-6;1,n;1,-v;1,x;1,-z;1,o;1,-g;1,-7;1,7w;1,9m;1,8;1,3;1,-e;1,-1;1,-1;1u,-9;1,f;1,-g;1,jb;1,6;1,65;1,19;1,28;1,-1;1,22;1,1z;1,2b;1,2;1,a4;1,-b;1,1l;1,-15;1,-18;1,14;1,-y;1,8;1,7;1,1y;1,-2;1,-8;1,9;1,-f;1,-a;1,-d;1,-q;1,-7;1,1d;1,6i;1,1;1,dt;1,17;1,-w;1,c;1,3;1,g;1,-h;1,-t;1,d;1,-8;1,-7;1,15;1,-w;1,1;1,-h;1,9y;1,1f;1,h;1,6f;1,-e;1,-2;1,1;1,e;1,-i;1,k;1,-b;1,3a;1,i9;1,-13;z,-j;1,t;1,-n;1,-c;1,x;1,-1x;1,2a;1,-1k;1,u;1,3;1,-d;1,-b;1,12;1,d;1,-15;1,6;1,-8;1,do;1,17;1,26;1,-1;1,k;1,16;1,it;1,d;1,10;1,-t;1,c;1,-1e;1,d;1,16;1,-2;1,-w;1,-d;1,10;1,-2;1,-f;1,12;1,-1n;1,6;1,14;1,g;1,-16;1,-3;1,d;1,ii;1,b;1,g;1,-5;1,-r;1,u;1,-b;1,g;1,-6;1,-q;1,p;1,-7;1,-o;1,y;1,-i;1,6c;1,o;1,6d;1,e;1,-6;1,-1;1,8h;1,-l;1,-5;1,a;1,-1;1,-t;1,-2;1,q;1,2;1,1;1,7u;1,2;1,3s;1,-g;1,h;1,-f;1,-1;1,9;1,5;1,-b;1,-1;1,6j;1,1;1,3g;1,g;1,-5;1,-8;1,5;1u,m;1,-f;1,2;1,-g;1,9;1,3;1,-6;1,3w;1,4g;1,y;1,-p;1,1;1,-c;1,-3;1,-d;1,l;1,2;1,-k;1,6z;1,5;1,2;1,23v;1,-227;1,2n;1,-2;1,6;1,-c;1,b;1,-1;1,3l;1,1;1,5z;1,21;1,-2o;1,e;1,-7;1,96;1,2;1,2;1,66;1,-q;1,o;1,-g;1,e;1,-1g;1,er;1,-5;1,1;1,8;1,1j;1,-1;1,-4;1,4y;1,2;1,1a;1,-2;1,6l;1,-1;1,8;1,-j;1,9;1,5;1,-8;z,e;1,1;1,-k;1,4f;1,1u;1,fv;1,-b;1,-1m;1,-c;1,1w;1,-f;1,5;1,-y;1,z;1,-h;1,-v;1,-7;1,18;1,2;1,6;1,4;1,-13;1,ew;1,-2;1,3;1,4a;1,q;1,-b;1,-1;1,-7;1,-2;1,-3;1,7;1,1;1,3;1,4;1,9b;1,3q;1,-b;1,5;1,3;1,-4;1,5;1,4;1,-n;1,b;1,-3;1,5m;1,1z;1,3s;1,7;1,1;1,-d;1,3;1,7;1,n;1,-b;1,-p;1,1p;1,-1b;1,k;1,-o;1,-b;1,c;1,-2;1,d;1,2;1,-1p;1,16;1,e2;1,14;1,-1;1,1t;1,-3;1,1;1,-4;1,-i;1,h;1,-1;1,3;1,7w;1,-2;1,9;1,7;1,4;1,7;1,-g;1,-6;1,2;1,5o;1,29;1,6;1,-b;1,c;1u,45;1,j;1,49;1,-1;1,9;1,-h;1,i;1,-o;1,p;1,-5;1,-9;1,8;1,-1;1,-1;1,4;1,-j;1,3;1,5t;1,5;1,2d;1,-2;1,-1;1,2o;1,32;1,w;1,-v;1,5;1,3;1,-2;1,t;1,-g;1,p;1,-j;1,-t;1,l;1,4;1,-8;1,-c;1,6;1,r;1,n2;1,74;1,-4;1,1;1,1k;1,-2;1,-2;1,1;1,19;1,4;1,-2;1,-3;1,2o;1,u;1,2;1,4a;1,1;1,2;1,-9;1,8;1,-6;1,6o;1,-8;z,9;1,1;1,51;1,-2;1,3;1,8d;1,eg;1,bd;1,3w;1,5;1,d;1,-fg9;1,7;1,-9;1,-f;1,n;1,-j;1,-5;1,-6;1,2;1,w;1,-z;1,r;1,3d;1,41;1,40;1,-1;1,4v;1,3g;1,gh;1,2;1,r;1,-4;1,-q;1,n;1,-e;1,3;1,4;1,1;1,-n;1,v;1,9;1,-n;1,8;1,-q;1,82;1,-2;1,9r;1,9;1,5;1,g;1,-9;1,-h;1,c;1,-8;1,3k;1,14;1,-3;1,2;1,1y;1,-1;1,ag;1,5;1,3;1,-i;1,-1;1,2;1,b;1,42;1,2x;1,9;1,-6;1,4;1,1;1,2;1,-6;1,2;1,-5;1,1a;1,2d;1,82;1,3;1,5w;1,8;1,-e;1,2;1,-3;1,3j;1,3;1,1g;1,1o;1,16;1,21;1,b2;1u,-8;1,c;1,18;1,-l;1,1;1,-4;1,-5;1,-2;1,t;1,51;1,gt;1,-1b;1,-4;1,28;1,-18;1,-p;1,r;1,-15;1,m;1,-1f;1,1l;1,e;1,6v;1,1b;1,1i;1,-1;1,5o;1,6;1,-b;1,lb;1,c;1,-j;1,18;1,-j;1,11;1,-8;1,-1c;1,s;1,4;1,-g;1,9;1,s;1,-3;1,-w;1,v;1,-12;1,t;1,-w;1,bq;1,3;1,6f;1,lc;1,-v;1,-m;1,l;1,-v;1,1h;1,l;1,-u;1,c;1,-t;1,-d;1,w;z,-z;1,-g;1,n;1,17;1,7;1,-6;1,-f;1,-e;1,m;1,4;1,2h;1,-2m;1,-1q;1,l;1,-f;1,-12;1,17;1,il;1,5;1,-s;1,d;1,-6;1,e;1,4s;1,2c;1,4;1,4u;1,c;1,7o;1,-1;1,7;1,6;1,-3;1,47;1,3x;1,46;1,-q;1,-2;1,-2;1,a;1,5q;1,2;1,4h;1,-7;1,2;1,-u;1,9s;1,-y;1,8;1,c;1,-a;1,-6;1,6j;1,1;1,-2;1,4h;1,3;1,3d;1,-1;1,1w;1,2;1,4y;1,-c;1,-a;1,-m;1,y;1,6;1,-9;1,-5;1,15;1,-1d;1,-3;1,8l;1,4;1,1;1,71;1,-b;1,-k;1,x;1,1;1,-u;1,16;1,-m;1,-2;1,-1;1,9;1,-o;1,t;1,-a;1,3;1,-b;1,11;1,-b;1,-r;1u,ck;1,34;1,1;1,-2;1,3j;1,-4;1,19;1,5l;1,1c;1,f;1,-7;1,2;1,-b;1,3;1,2t;1,j;1,d;1,d;1,a;1,19;1,hq;1,-a;1,7;1,-2;1,-17;1,5;1,k;1,-m;1,1b;1,-j;1,8;1,j;1,-1v;1,18;1,l;1,-7;1,hh;1,-z;1,v;1,-p;1,3;1,f;1,-s;1,1p;1,-u;1,-e;1,cq;1,f;1,-e;1,5;1,-1;1,5;1,-l;1,1e;1,-17;1,c7;1,-q;1,i;1,5;1,-m;1,k;1,-e;1,h;z,6;1,-5;1,3;1,-g;1,-7;1,9;1,d;1,cj;1,z;1,-1;1,1z;1,-2;1,1;1,49;1,1a;1,-4;1,2v;1,7s;1,-2;1,3;1,-2;1,40;1,59;1,-8;1,4;1,7;1,-a;1,5;1,4;1,-5;1,-2;1,5a;1,-1;1,6;1,2f;1,3;1,-1;1,-3;1,78;1,8;1,5;1,j;1,-2;1,-r;1,o;1,9;1,c;1,-18;1,l;1,ls;1,7;1,1;1,-6;1,2;1,-1;1,6t;1,3;1,-1;1,1d;1,6;1,1a;1,3g;1,9;1,35;1,x;1,1;1,47;1,2;1,2a;1,2;1,7;1,-3;1,54;1,6m;1,1;1,1i;1,2j;1,1;1,c2;1,2;1,-3;1,cp;1,3j;1,f;1,-fgm;1,-4;1,-5;1,-6;1,4;1,9;1,6;1,1;1,-4;1,5z;1u,4r;1,1;1,1;1,4;1,-3;1,2u;1,5e;1,ho;1,d;1,-2;1,-7;1,d;1,-b;1,-b;1,16;1,-5;1,9;1,t;1,-1q;1,-7;1,1;1,gg;1,v;1,-1;1,l;1,-n;1,i;1,-5;1,-3;1,5j;1,bg;1,-e;1,g;1,-m;1,n;1,-4;1,6e;1,-2;1,-3;1,2;1,3d;1,1;1,8o;1,-9;1,5q;1,-3;1,2;1,3l;1,-8;1,5;1,-2;1,6;1,-3;1,2w;1,15;1,1y;1,-2;1,ch;1,-f;1,7;1,-h;1,-8;1,19;z,-6;1,-c;1,-5;1,j;1,15;1,-n;1,r;1,-t;1,u;1,-i;1,a;1,-g;1,q;1,3k;1,fv;1,6;1,a;1,11;1,k;1,-16;1,8;1,w;1,-b;1,-i;1,2;1,k;1,-n;1,s;1,-1;1,-2;1,-h;1,i;1,-j;1,9;1,h;1,5e;1,2;1,1;1,8m;1,-3;1,9;1,-3;1,oi;1,-4;1,-1j;1,p;1,t;1,-5;1,-s;1,10;1,-e;1,-9;1,-n;1,f;1,3;1,-o;1,10;1,8v;1,-2;1,2e;1,x;1,1;1,op;1,1p;1,8;1,-1f;1,l;1,-i;1,1e;1,-p;1,-i;1,t;1,-a;1,w;1,-k;1,-a;1,-c;1,1f;1,-1r;1,-3n;1,4a;1,-f;1,-1;1,g0;1,d;1,5;1,-9;1,4u;1,1x;1,4z;1,9;1,7m;1,y;1,-8;1u,-5;1,2;1,73;1,4h;1,9;1,-a;1,5;1,2;1,-5;1,1;1,3c;1,w;1,16;1,4q;1,-7;1,5;1,5;1,-6;1,8w;1,-6;1,-b;1,g;1,-c;1,n;1,-p;1,k;1,a7;1,-3;1,4;1,-3;1,-6;1,4;1,38;1,-1;1,73;1,4;1,j;1,-g;1,i;1,1;1,-6;1,-x;1,18;1,72;1,7q;1,k;1,-5;1,c;1,-z;1,k;1,-f;1,b;1,-5;1,-9;1,4;1,b;1,-23;1,1n;1,p;1,7;1,ak;1,2;1,1k;z,1m;1,1p;1,ad;1,1;1,1;1,3;1,-6;1,-2;1,ov;1,12;1,-z;1,-18;1,1q;1,1;1,-q;1,-2;1,i;1,-2;1,-d;1,-14;1,1l;1,-12;1,7;1,ho;1,-e;1,2;1,-m;1,6;1,i;1,-g;1,-f;1,-2;1,-b;1,7;1,7c;1,2;1,4z;1,-9;1,b;1,1;1,2;1,-b;1,c2;1,m;1,-b;1,-3;1,-1b;1,1i;1,19;1,-1y;1,n;1,-7;1,-3;1,-f;1,12;1,-9;1,-n;1,3;1,y;1,a9;1,2;1,u;1,38;1,-2;1,8;1,-2;1,8;1,1;1,-b;1,1;1,-7;1,e;1,-9;1,3w;1,1e;1,4;1,3s;1,-r;1,d;1,5;1,-j;1,q;1,-a;1,2;1,-3;1,4c;1,2r;1,-2;1,4;1,a;1,-3;1,4;1,-e;1,2;1u,7;1,90;1,5;1,-6;1,5;1,a;1,55;1,-3;1,-6;1,a;1,2e;1,2;1,2;1,-8;1,8y;1,-a;1,-4;1,1f;1,-1q;1,1k;1,-z;1,-e;1,9;1,m;1,-b;1,15;1,-1q;1,l7;1,4;1,9f;1,2;1,1;1,2;1,2f;1,19;1,-2;1,4;1,42;1,a;1,-f;1,47;1,2f;1,9;1,-1;1,6;1,5h;1,-d;1,f;1,-4;1,-a;1,4;1,-3;1,7;1,66;1,1j;1,1;1,1k;1,u;1,-1;1,1f;1,-8;1,bb;1,3;z,-6;1,bq;1,l;1,g;1,-duu;1,dyi;1,-fgg;1,6;1,-4;1,-4;1,5;1,2z;1,16;1,1f;1,50;1,2;1,2o;1,o6;1,i;1,e;1,-g;1,-5;1,k;1,-e;1,-2;1,-3;1,c;1,-2;1,-3;1,-a;1,k;1,gb;1,-3;1,9;1,-2;1,4p;1,bz;1,n;1,1w;1,3c;1,u;1,n0;1,h4;1,-x;1,o;1,-v;1,1v;1,-n;1,8;1,c;1,-2;1,2w;1,id;1,-4;1,a;1,-g;1,1;1,u;1,-m;1,3;1,-5;1,b;1,-e;1,j;1,2;1,-m;1,52;1,9e;1,3;1,-g;1,b;1,3;1,-f;1,p1;1,-5;1,2;1,v;1,i;1,-j;1,-v;1,b;1,u;1,-1;1,-m;1,-4;1,-i;1,16;1,-n;1,7l;1,u;1,3y;1,ql;1,-h;1,-g;1u,y;1,-v;1,t;1,-q;1,c;1,d;1,-7;1,-3;1,-g;1,-6;1,k;1,ei;1,b;1,7;1,2;1,-a;1,d;1,-s;1,l;1,b;1,3;1,-p;1,1;1,bo;1,8k;1,7;1,-b;1,7;1,-1;1,1w;1,16;1,1;1,87;1,4;1,2;1,4t;1,-2;1,57;1,-2;1,1;1,6;1,8z;1,-e;1,i;1,-5;1,5b;1,4n;1,1;1,-8;1,6;1,-1;1,33;1,7z;1,1k;1,-20;1,r;1,-9;1,6;1,8;1,-3;1,6n;1,1;1,8k;z,7;1,-9;1,j;1,8;1,-5;1,-1;1,-k;1,7;1,a1;1,1l;1,1q;1,1;1,-3;1,1m;1,az;1,-a;1,-1;1,2b;1,d;1,28;1,1;1,kx;1,f;1,-h;1,w;1,1;1,-12;1,6;1,10;1,-3;1,-c;1,f9;1,s;1,-1;1,4;1,-l;1,5w;1,5l;1,8;1,-d;1,6;1,-a;1,3t;1,-4;1,8w;1,k;1,-f;1,6;1,f;1,-10;1,b;1,7;1,g;1,3;1,1;1,-b;1,-a;1,6;1,3;1,6;1,a7;1,2;1,12;1,2p;1,9c;1,-j;1,3;1,e;1,-9;1,-4;1,7a;1,-c;1,9;1,-5;1,39;1,-2;1,5r;1,-1;1,4;1,-6;1,a;1,-2;1,56;1,2m;1,b2;1,m;1,-1q;1,1n;1,-4;1,-d;1,-12;1,1b;1,-13;1,m;1u,-a;1,m;1,-5;1,-c;1,p;1,-l;1,iq;1,6k;1,1;1,2;1,17;1,1l;1,3;1,5;1,-9;1,6;1,-4;1,24;1,1;1,a;1,1e;1,48;1,8;1,3;1,-4;1,-a;1,c;1,-l;1,6k;1,o;1,-a;1,-3;1,6;1,-7;1,5v;1,-b;1,f;1,5j;1,4;1,1r;1,-e;1,1n;1,2x;1,as;1,e;1,3;1,2;1,-m;1,9;1,cd;1,-4;1,55;1,f;1,-fhu;1,-b;1,2;1,h;1,cj;1,pl;1,-e;1,g;1,-b;1,2;z,8;1,g6;1,-2;1,-2;1,-3;1,gy;1,-6;1,-6;1,2e;1,59;1,1d;1,9g;1,-2;1,3;1,-5;1,4z;1,69;1,35;1,ek;1,-7;1,5;1,v;1,-r;1,2v;1,2;1,ii;1,-4;1,e;1,8;1,g;1,-a;1,6;1,5;1,-f;1,b;1,45;1,1;1,9i;1,-3;1,q2;1,k;1,-g;1,u;1,-6;1,1r;1,-1k;1,-11;1,p;1,-7;1,g;1,58;1,2a;1,18;1,1a;1,r4;1,p;1,-i;1,1;1,-5;1,9;1,7;1,4;1,-33;1,30;1,-b;1,8;1,-k;1,p;1,2;1,dz;1,-8;1,f;1,-8;1,-1;1,8;1,-1;1,8;1,-k;1,2d;1,h;1,8a;1,2;1,8n;1,7;1,-a;1,2;1,bi;1,-4;1,a;1,4e;1,5l;1,-9;1,6;1,-4;1u,-5;1,6;1,1u;1,7c;1,3;1,-6;1,-5;1,i;1,4m;1,3;1,4t;1,2w;1,94;1,6;1,-f;1,-7;1,l;1,-18;1,74;1,-4;1,2;1,4;1,-3;1,-6;1,4;1,9d;1,g;1,8;1,-f;1,-5;1,h;1,-o;1,i;1,-c;1,k;1,-4;1,-d;1,5;1,f;1,-j;1,a;1,-g;1,7p;1,4v;1,9;1,39;1,1;1,-2;1,-1;1,4;1,9f;1,-3;1,-9;1,8;1,-2;1,-1;1,-2;1,c;1,-b;1,16;1,x;1,2w;1,mx;z,-12;1,-6;1,u;1,-b;1,3;1,r;1,-k;1,-k;1,x;1,-u;1,65;1,9l;1,h;1,-u;1,v;1,-c;1,-r;1,g;1,-1;1,e;1,3;1,a8;1,-5;1,e;1,-c;1,5;1,33;1,9u;1,9;1,2;1,2;1,-h;1,m;1,-3;1,-p;1,c;1,8h;1,-2;1,1g;1,3r;1,3;1,-1;1,-4;1,3;1,4t;1,4h;1,2;1,-3;1,2;1,6y;1,-6;1,4;1,3;1,-6;1,8w;1,-2;1,7;1,-3;1,1;1,-2;1,55;1,2y;1,-5;1,-2;1,c1;1,1h;1,-2i;1,25;1,-17;1,r;1,-q;1,-1f;1,2u;1,-i;1,-h;1,l;1,-m;1,-6;1,hi;1,1;1,1;1,-4;1,-2;1,6j;1,7;1,u;1,1y;1,2;1,3m;1,1f;1,37;1,34;1,3j;1,5o;1u,-2;1,bz;1,-3;1,-1;1,3;1,b2;1,4;1,98;1,1w;1,f;1,-2;1,1;1,-2;1,2r;1,d;1,-ew9;1,j7;1,p;1,ff;1,-1;1,gw;1,th;1,hy;1,28;1,jl;1,-2;1,c;1,8;1,-c;1,1;1,-4;1,5c;1,85;1,22;1,p9;1,-7;1,n;1,-8;1,-3;1,a;1,-k;1,1;1,4w;1,p;1,1j;1,uy;1,2;1,-d;1,8;1,-c;1,n;1,-2;1,do;1,1;1,2;1,-6;1,an;1,-2;1,8i;1,o;1,2e;1,8x;1,2;z,-6;1,a3;1,2;1,-4;1,1;1,9e;1,4g;1,4z;1,1;1,-2;1,2s;1,1;1,9y;1,-4;1,3;1,-c;1,5;1,-2;1,5i;1,a5;1,1;1,9;1,-4;1,7;1,-f;1,7;1,6n;1,4x;1,2;1,3g;1,-1;1,9j;1,2;1,1n;1,qt;1,-12;1,10;1,3;1,-7;1,-p;1,a;1,-1;1,-j;1,g9;1,-3;1,6;1,-i;1,bq;1,18;1,1u;1,8k;1,h;1,-d;1,-1;1,85;1,51;1,9g;1,a;1,3;1,-2;1,-5;1,-a;1,2z;1,3t;1,4;1,8q;1,-4;1,5;1,83;1,1;1,10;1,ck;1,-a;1,c;1,c;1,h;1,-5;1,-2;1,4;1,-o;1,2;1,-3;1,fx;1,2;1,-6;1,5;1,7h;1,-6;1,-3;1,2;1,3;1,1y;1,3j;1,3;1u,7;1,24;1,2c;1,2;1,-3;1,2;1,5;1,2v;1,3o;1,1;1,-2;1,-f;1,3b;1,2x;1,4z;1,1u;1,3;1,21;1,-1;1,-1;1,3h;1,-1;1,1g;1,-1h;1,-8;1,b5;1,c;1,3;1,ao;1,1h;1,n;1,-feh;1,12q;1,ft;1,1;1,3;1,lv;1,dcr;1,-cro;1,li;1,5;1,-1;1,-1;1,ln;1,f;1,cx;1,-3;1,so;1,-8;1,-3;1,-7;1,11k;1,4;1,9;1,-e;1,3;1,-8;1,3;1,dq;1,7;1,23;1,22;1,5y;z,2;1,8z;1,d;1,p;1,4k;1,-1;1,61;1,2;1,9y;1,9e;1,48;1,56;1,-2;1,d1;1,1;1,-7;1,5;1,-6;1,9;1,ff;1,2;1,c;1,-g;1,1;1,7v;1,-7m;1,8z;1,3;1,-1;1,f4;1,sx;1,-c;1,d;1,-l;1,f;1,1;1,i;1,ec;1,a;1,8;1,-k;1,5;1,9u;1,-1;1,-9;1,8;1,df;1,r;1,-4;1,-f;1,h;1,-c;1,1;1,-9;1,j;1,bz;1,2;1,aa;1,-a;1,l;1,-h;1,-a;1,e;1,-6;1,68;1,-6;1,2n;1,65;1,1;1,86;1,-3;1,fn;1,-g;1,e;1,-s;1,5;1,k;1,1;1,-7;1,c;1,-l;1,b;1,c;1,-d;1,h;1,dw;1,60;1,1b;1,1z;1,-3;1,1m;1,3f;1,v;1,2r;1u,-6;1,3;1,2p;1,3t;1,4;1,5p;1,3;1,6s;1,63;1,-1;1,-h;1,5;1,by;1,-14;1,h;1,-8;1,2;1,86;1,5;1,-4;1,x;1,-eyk;1,q8;1,f;1,-1;1,-2;1,8;1,fc;1,gs;1,3;1,1m;1,3d;1,cz;1,tr;1,2;1,m6;1,-4;1,5;1,ct;1,1t;1,qt;1,11u;1,-e;1,2;1,da;1,a3;1,9g;1,b7;1,3;1,jl;1,4;1,2;1,-1;1,bg;1,1b;1,9i;1,-9;1,a;1,4i;1,1;1,3pa;1,-3e9;1,-1;z,6;1,5m;1,50;1,d6;1,3w;1,ph;1,-2;1,o;1,-n;1,c;1,5;1,-4;1,3;1,ei;1,1;1,9b;1,2e;1,1q;1,ag;1,-4;1,-6;1,9;1,-g;1,c;1,bo;1,-2;1,ak;1,-8;1,4;1,-3;1,mq;1,n;1,gd;1,-l;1,-6;1,dg;1,9b;1,b8;1,3y;1,-1;1,2f;1,3n;1,5;1,7;1,-2;1,da;1,-6;1,h8;1,1o;1,1f;1,1z;1,1c;1,4;1,-2;1,-ffu;1,1;1,13d;1,-1;1,2;1,gi;1,ns;1,9t;1,tr;1,2;1,m7;1,-1;1,3d;1,9g;1,sy;1,9;1,-a;1,54;1,wq;1,cv;1,3w;1,fj;1,-2;1,b9;1,a2;1,vx;1,fz;1,-3;1,8g;1,197;1,m;1,-j;1,eh;1,-1;1,-1;1,-2;1,97;1,2;1,29;1,c7;1u,3;1,6;1,ba;1,af;1,3;1,-2;1,5w;1,28;1,ej;1,hg;1,5;1,2;1,5;1,-2;1,-6;1,-7;1,c7;1,9i;1,1;1,-7;1,5p;1,2w;1,-2;1,6q;1,6m;1,-2;1,-3;1,-2;1,41;1,3p;1,-3;1,64;1,-8;1,ay;1,5;1,e;1,-a;1,6d;1,2a;1,16;1,1v;1,a;1,1;1,-ffv;1,-1;1,13h;1,2;1,-1;1,xi;1,gl;1,-2;1,ak;1,j5;1,md;1,15y;1,2f;1,z4;1,7;1,mg;1,9w;1,4m;1,6c;1,-2;z,nb;1,j1;1,-1;1,tb;1,-1;1,9u;1,1hv;1,-3;1,3x;1,as;1,ba;1,1;1,ai;1,2;1,5q;1,dj;1,l8;1,d;1,1;1,kr;1,1;1,3p;1,-2;1,4q;1,6i;1,74;1,-8;1,3p;1,20;1,8f;1,-o;1,d;1,-3;1,bc;1,4;1,9p;1,1k;1,-2;1,16;1,-edk;1,1e2;1,tm;1,mb;1,8;1,-1;1,ci;1,tg;1,1xm;1,168;1,be;1,-1;1,2;1,fi;1,3;1,-2;1,ni;1,uu;1,7;1,du;1,nt;1,zq;1,-1;1,r8;1,-3;1,4;1,lg;1,7b;1,6l;1,72;1,1;1,-4;1,3g;1,1;1,-3;1,ar;1,3;1,-1;1,b3;1,56;1,2d;1,-e8z;1,ew;1,2f7;1,27m;1,177;1,1;1,9x;1,1h5;1,1k;1,1pq;1,3;1,15;1,mp;1,-1;1u,4;1,-1sv;1,23o;1,x1;1,iy;1,k8;1,6;1,-4;1,3m;1,4q;1,dr;1,5f;1,1i;1,7b;1,be;1,1;1,3m;1,1;1,3u;1,34;1,-5;1,-cqn;1,2eb;1,11p;1,2dl;1,2;1,2bx;1,at;1,yp;1,m8;1,j5;1,-2;1,sh;1,6l;1,ag;1,25;1,q1;1,-960;1,1h2;1,3wg;1,1r1;1,nm;1,ih;1,3;1,-5hl;1,2kg;1,lq;1,m3;1,jc;1,1;1,-2;1,1kr;1,1;1,hr;1,-3oj;1,1m3;1,1wb;1,-8oi;1,7ya;1,5j;1,kq;1,3;1,-6ng;z,-ewk;1,-2p;1,1;1,-49;1,1o;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,e;1,1;1,1;1,1;1,1;1,1;1,1;1u,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;z,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-8v6;1,1;1,-k;1,l;1,1;1,1;1,1;1,1;1,1;1,1;1,7;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,s;1,-r;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,6c1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,b;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;90,891;1,q;1,pl;1,85;1,2w;1,-12z;1,5;1,1n;1,1y;1,1my;1,w8l;1,-v4u;1,lh;1,-3fo;1,oo;1,-op;1,w;1,2t;1,1b;1,7;1,-1;1,k0;1,9w;1,34;1,25;1,o7;1,df;1,15;1,kk;1,dr;1,1k2;1,15e;1,p;1,20;1,17v;1,-74e;1,b;1,4s;1,-c;1,d;1,-8;1,-4;1,-3;1,mq;1,7k;1,1c;1,ra;1,1;1,dw;1,o;1,gi;1,3;1,3y;1,15;1,1l;1,-1;1,b5;1,3g;1,2;1,93;1,g0;1,1z;1,1xh;z,x;1,d;1,-4;1,-4;1,19v;1,2;1,62;1,17y;1,1ci;1,49g;1,-e1c;1,a;1,k;1,-1j;1,v;1,-z;1,f;1,-9;1,h;1,l;1,-r;1,3;1,t;1,-f;1,-f;1,-g;1,u;1,in;1,2q;1,-a;1,7;1,46;1,3g;1,-3;1,1a;1,1p;1,3h;1,ka;1,-2;1,27;1,-4;1,a;1,eg;1,1w;1,-4;1,9;1,-a;1,3;1,-7;1,8;1,d3;1,5b;1,g;1,2f;1,-2;1,1;1,3;1,9t;1,46;1,f;1,3i;1,o;1,2i;1,2p;1,-1;1,-5;1,i5;1,2;1,6;1,-3;1,5;1,-4;1,-9;1,7;1,-6;1,b;1,p6;1,-1;1,9c;1,-5;1,-1;1,3;1,-1;1,5;1,-3;1,-9;1,yt;1,1a;1,c;1,a;1,-d;1,-5;1,a;1,-9;1u,1;1,th;1,dp;1,2e;1,1;1,61;1,bg;1,9h;1,s6;1,yk;1,mf;1,4;1,4;1,-3;1,2;1,r2;1,mp;1,1ej;1,-2;1,1;1,3;1,-7;1,13i;1,2;1,-4;1,3;1,-dzh;1,-r;1,13;1,-p;1,a;1,h;1,-12;1,15;1,-l;1,d;1,-u;1,n;1,-17;1,6;1,c;1,y;1,fi;1,16;1,2r;1,2;1,3;1,3w;1,1;1,2j;1,2i;1,f;1,s;1,1;1,4h;1,7;1,-d;1,16;1,-f;1,-18;1,3;1,9;1,-d;z,11;1,i;1,-e;1,-p;1,-4;1,z;1,iv;1,-7;1,-2;1,2k;1,4;1,7;1,-3;1,2;1,7;1,c4;1,1m;1,2u;1,-e;1,8;1,-9;1,-9;1,k;1,-i;1,-1;1,o;1,-6;1,dp;1,4;1,46;1,2;1,2r;1,2;1,-7;1,3;1,-2;1,9;1,-8;1,-4;1,d;1,2;1,97;1,16;1,4;1,3h;1,-2;1,3;1,-4;1,5;1,3c;1,o;1,2j;1,-2;1,2k;1,-1;1,-1;1,t;1,-5;1,6;1,5;1,-i;1,3;1,-1;1,n;1,-b;1,8;1,4;1,5;1,-c;1,g6;1,21;1,9;1,2;1,1;1,5;1,-d;1,-m;1,a;1,-1;1,-a;1,h;1,7;1,-h;1,6;1,-b;1,2;1,jn;1,55;1,4;1,-1;1,-1;1,3;1,9c;1,2;1u,i;1,-4;1,-9;1,-4;1,l;1,-g;1,d;1,-f;1,w5;1,21;1,1;1,2m;1,-h;1,4;1,p;1,7;1,4;1,-u;1,-2;1,-6;1,1d;1,-19;1,q;1,e;1,7;1,-1i;1,d;1,-e;1,m;1,j;1,rq;1,6;1,dl;1,2k;1,-2;1,6;1,3;1,-5;1,-7;1,b;1,5s;1,2;1,-4;1,1;1,-2;1,bs;1,-1;1,2j;1,1;1,6k;1,jg;1,1dj;1,2p;1,4;1,-9;1,2;1,a;1,dw;1,-1;1,-a;1,9;1,3;1,2;z,-9;1,-7;1,1;1,1ys;1,nl;1,-a;1,68;1,2;1,4;1,-7;1,9;1,-7;1,13k;1,-8;1,7;1,-2;1,-e7u;1,9x;1,-s;1,9;1,-8;1,3;1,7;1,-h;1,-2;1,l;1,-5;1,-d;1,-17;1,23;1,-19;1,1c;1,-x;1,8;1,-9;1,o;1,c;1,-8;1,a;1,-c;1,-g;1,j;1,-16;1,3;1,fk;1,u;1,2;1,3b;1,-3;1,1;1,j;1,-l;1,3v;1,26;1,1;1,1d;1,2e;1,2;1,6r;1,-8;1,2;1,g;1,-f;1,6;1,-t;1,f;1,4;1,-p;1,7;1,8;1,-e;1,13;1,-u;1,-e;1,-1;1,1k;1,-1h;1,4;1,-3;1,ib;1,2;1,3a;1,3;1,-5;1,-2;1,6;1,-1;1,6;1,a;1,-b;1,6;1,-8;1,1;1,-i;1u,6;1,l;1,b3;1,1l;1,34;1,5;1,l;1,-1;1,-s;1,q;1,-b;1,-b;1,6;1,7;1,j;1,-11;1,c;1,3;1,8;1,-k;1,j;1,bf;1,3;1,1a;1,2;1,4v;1,3;1,2v;1,-a;1,-4;1,l;1,-6;1,-7;1,4;1,-d;1,4;1,a;1,-b;1,8;1,-3;1,-a;1,8;1,h;1,-6;1,-a;1,a9;1,-3;1,5;1,7j;1,-6;1,1;1,1;1,1c;1,1a;1,-4;1,-1;1,2p;1,7;1,20;1,-7;1,-d;1,p;1,-13;z,15;1,-16;1,d;1,s;1,-p;1,4;1,e;1,-a;1,-l;1,3;1,u;1,-r;1,-2;1,-5;1,-3;1,j;1,e0;1,15;1,34;1,7;1,t;1,-j;1,-k;1,c;1,k;1,-s;1,5;1,-4;1,c;1,-i;1,7;1,8;1,hx;1,2z;1,j;1,26;1,-d;1,8;1,e;1,-a;1,-d;1,8;1,8;1,2;1,-8;1,-8;1,k;1,-1;1,6e;1,k;1,3f;1,-p;1,y;1,4;1,-s;1,5;1,t;1,-i;1,-2;1,-g;1,p;1,-1;1,-i;1,11;1,-e;1,8;1,-m;1,-6;1,4;1,-9;1,1;1,r;1,pd;1,2j;1,-2;1,2o;1,1r;1,3a;1,2h;1,-1;1,3;1,-l;1,-z;1,u;1,-13;1,1m;1,-1c;1,p;1,-e;1,-8;1,9;1,3;1,13;1,5;1u,-w;1,b;1,-15;1,-16;1,j;1,-t;1,2m;1,-u;1,34;1,-2r;1,-6;1,-n;1,21;1,-16;1,q;1,-o;1,qr;1,4;1,-j;1,e;1,-d;1,-2;1,d;1,5;1,-k;1,o;1,-n;1,dj;1,30;1,-b;1,d;1,-f;1,j;1,-a;1,2;1,6;1,-e;1,5;1,5v;1,-3;1,c;1,-7;1,-4;1,-2;1,c;1,-f;1,8w;1,b;1,2f;1,1;1,-2;1,26;1,c;1,7r;1,1w;1,-2;1,-1;1,5;1,77;1,4;1,-3;1,2;1,-1;z,-3;1,97;1,-3;1,3q;1,4z;1,3;1,3k;1,ai;1,3s;1,mw;1,2i;1,v;1,-b;1,l;1,-3;1,-8;1,ab;1,3k;1,w;1,-l;1,-h;1,-2;1,3;1,q;1,-e;1,7;1,e;1,-u;1,s;1,-6;1,-c;1,-7;1,8;1,p;1,-u;1,v;1,-d;1,-k;1,r2;1,-1;1,-2;1,1;1,160;1,os;1,-7;1,8;1,-6;1,9;1,-1;1,2;1,63;1,2;1,-5;1,4;1,-3;1,13d;1,4;1,-1;1,-2;1,9;1,-dx2;1,-8;1,e;1,-x;1,n;1,2;1,-a;1,j;1,8;1,-3;1,-u;1,-8;1,14;1,-k;1,f;1,-s;1,6;1,-7;1,1f;1,go;1,5;1,3b;1,2;1,3f;1,1r;1,r;1,-1;1,3;1,-1;1,82;1,-p;1,c;1,-8;1,16;1u,-c;1,956;1,-95i;1,-9;1,14;1,-w;1,f;1,1;1,-12;1,-1c;1,24;1,-q;1,s;1,-24;1,30;1,-1a;1,lh;1,-n;1,1;1,5;1,-o;1,b;1,6;1,-2;1,-7;1,4;1,-9;1,a;1,c;1,-b;1,-5;1,9r;1,p;1,1y;1,3y;1,-3;1,g;1,i;1,-f;1,-k;1,t;1,3;1,-1;1,-6;1,-i;1,e;1,5;1,-s;1,e;1,a;1,2;1,-l;1,u;1,-a;1,-7;1,cb;1,4k;1,3o;1,8;1,-c;1,b;1,-c;1,g;z,3;1,-4;1,-h;1,-2;1,3;1,c;1,-3;1,1;1,-5;1,-7;1,-2;1,8;1,h;1,p;1,75;1,14;1,1;1,1;1,-3;1,4;1,3w;1,-c;1,-2;1,-7;1,8;1,2;1,2q;1,13;1,14;1,1c;1,4x;1,2;1,r;1,u;1,-k;1,-p;1,e;1,-c;1,2;1,i;1,-f;1,-c;1,2;1,t;1,-1n;1,w;1,k;1,e;1,8;1,d0;1,1;1,3w;1,1q;1,-2;1,-m;1,p;1,-b;1,-o;1,e;1,m;1,-3;1,-k;1,-2;1,a;1,j;1,1;1,-q;1,r;1,-q;1,-b;1,gh;1,2;1,2v;1,l;1,3b;1,-l;1,h;1,3;1,-p;1,a;1,-4;1,h;1,-8;1,f;1,-t;1,n;1,5;1,-b;1,69;1,1;1,4x;1,1d;1,-16;1,-e;1u,y;1,-x;1,1p;1,-w;1,-o;1,-9;1,e;1,12;1,-7;1,-5;1,-16;1,o;1,-q;1,1w;1,-1;1,-8;1,-b;1,-x;1,-9;1,l;1,p;1,9;1,-1q;1,22;1,-1i;1,13;1,-x;1,-u;1,1k;1,-b;1,v;1,-1d;1,1;1,-7;1,13;1,-v;1,nx;1,2i;1,2;1,1e;1,w;1,2;1,8;1,1s;1,1;1,7b;1,c;1,-7;1,-e;1,t;1,3;1,-19;1,-8;1,-1c;1,2h;1,-1b;1,l;1,x;1,-w;1,-9;1,-h;1,t;1,11;z,-1t;1,n;1,v;1,-1g;1,c;1,1d;1,-1l;1,p;1,c;1,-10;1,q;1,-p;1,7;1,pz;1,-o;1,v;1,-d;1,-1;1,-f;1,j;1,1;1,-c;1,bc;1,8;1,1;1,y;1,4;1,3;1,-5;1,2k;1,q;1,4;1,3;1,-c;1,b;1,-4;1,-3;1,4i;1,1z;1,-a;1,6;1,-3;1,-c;1,-3;1,-1;1,-1;1,1j;1,-18;1,8;1,-9;1,5;1,3;1,-e;1,j;1,81;1,2;1,1s;1,p;1,1;1,2n;1,3;1,5r;1,23;1,1w;1,-5;1,1;1,1;1,5;1,-j;1,4;1,-1;1,6l;1,1;1,u;1,b;1,1;1,-d;1,b;1,-1;1,-1;1,-5;1,-6;1,g;1,8n;1,2;1,-1;1,-6;1,-1;1,41;1,-8;1,2;1,7;1,-8;1,4y;1u,-2;1,2b;1,1b;1,1;1,ah;1,-2;1,1;1,6;1,1;1,1;1,3m;1,5;1,-7;1,gn;1,1l;1,-4;1,1d;1,21;1,7;1,1;1,5;1,z;1,4h;1,-h;1,p;1,-f;1,-9;1,-6;1,e;1,-b;1,u;1,-a;1,3;1,-i;1,b;1,-c;1,6;1,8;1,f;1,-p;1,8i;1,y;1,37;1,1x;1,11;1,-5;1,e;1,-v;1,o;1,-17;1,2t;1,-27;1,-l;1,u;1,-8;1,-b;1,h;1,3;1,n;1,-h;1,-5;1,-6;1,-6;z,-6;1,-4;1,q;1,-7;1,-6;1,p6;1,-3;1,8;1,-9;1,cu;1,d;1,p;1,3;1,-1;1,a2;1,1d;1,3;1,ob;1,hd;1,-2;1,d;1,-e;1,7l;1,-1g;1,2;1,m;1,-g;1,-7;1,9;1,4;1,-3;1,7g;1,-1;1,w1;1,-5;1,2;1,2;1,-9;1,4;1,-dv4;1,-p;1,2;1,c;1,f;1,e;1,-l;1,-12;1,-1;1,1r;1,4;1,-b;1,-1i;1,1;1,w;1,5;1,4;1,7;1,e;1,-6;1,2;1,-z;1,98;1,1m;1,-1;1,1j;1,-6;1,1;1,3;1,6;1,43;1,-7;1,-8;1,c;1,1;1,-a;1,d;1,2z;1,1t;1,40;1,aw;1,-1w;1,1h;1,-5;1,-17;1,c;1,-f;1,1i;1,-r;1,5;1,4;1,-t;1,12;1,-c;1,-k;1u,p;1,-f;1,-4;1,1;1,-o;1,1a;1,-b;1,8;1,dy;1,1;1,5m;1,2u;1,-2l;1,-3;1,-o;1,c;1,-9;1,-1;1,-4;1,-2;1,9;1,8;1,9;1,-n;1,8;1,99;1,1o;1,5r;1,-3;1,n;1,1;1,-p;1,-6;1,8;1,-d;1,k;1,l;1,8p;1,1n;1,6;1,-1;1,2f;1,2b;1,-2;1,48;1,j;1,-h;1,3;1,6;1,9;1,-7;1,8g;1,-1;1,3k;1,6;1,-4;1,2;1,3r;1,-3;1,1j;1,6u;1,-3;1,d;z,-12;1,2p;1,-q;1,-8;1,i;1,-h;1,s;1,-q;1,i;1,6;1,-4;1,-g;1,l;1,-e;1,az;1,19;1,4s;1,u;1,1y;1,-16;1,o;1,1;1,-f;1,d;1,4h;1,-4r;1,i;1,-1;1,-e;1,-j;1,o;1,-d;1,10;1,-4;1,5;1,-18;1,q;1,-k;1,13;1,-9;1,-p;1,v;1,-n;1,8;1,ea;1,-4;1,3k;1,-3;1,1;1,-2;1,3s;1,l;1,-o;1,a;1,5d;1,1;1,7g;1,-5;1,1b;1,-n;1,1;1,8;1,g;1,4;1,-1l;1,r;1,-l;1,p;1,-a;1,2;1,2;1,v;1,-a;1,-g;1,-n;1,-b;1,2;1,i;1,2;1,6;1,v;1,-j;1,-l;1,-5;1,lo;1,3;1,-2;1,4;1,3;1,1l;1,45x;1,-456;1,2m;1,-2;1u,4;1,-5;1,-1;1,5;1,1q;1,9h;1,-n;1,1;1,i;1,-2x;1,2c;1,1d;1,-1m;1,a;1,b;1,2;1,y;1,-4;1,2q;1,-34;1,7;1,-14;1,9;1,-7;1,1j;1,-13;1,c;1,-t;1,z;1,m;1,-2x;1,1l;1,z;1,-d;1,2;1,4;1,-32;1,31;1,-8;1,2;1,-8;1,r;1,ng;1,-9;1,-2;1,c;1,-i;1,2um;1,-2tz;1,-b;1,-5;1,c;1,2;1,-c;1,-7;1,-8;1,1;1,1;1,j;1,-c;1,j;1,9t;1,1i;z,-1;1,-1;1,3u;1,-6;1,-6;1,a;1,-8;1,-3;1,8;1,6;1,5u;1,6;1,c;1,-f;1,-q;1,17;1,-4;1,6;1,-d;1,-a;1,9;1,-7;1,9;1,-3;1,-3;1,1;1,g;1,6u;1,1;1,l;1,1;1,18;1,1m;1,4;1,29;1,h;1,-6;1,9;1,-4;1,-1;1,-9;1,4;1,5s;1,1r;1,2c;1,-2;1,-b;1,3;1,-1;1,h;1,-i;1,4;1,4;1,1;1,8;1,5;1,70;1,9;1,-a;1,j;1,-6;1,-7;1,6;1,-3;1,-a;1,8;1,a;1,-9;1,7;1,83;1,7;1,-c;1,d;1,-9;1,-1;1,-1;1,4a;1,1;1,-c;1,e;1,-1;1,-3;1,-e;1,2;1,-1;1,4p;1,3;1,-4;1,6;1,1;1,-2;1,-3;1,29;1,1k;1u,-c;1,f;1,-e;1,a;1,-7;1,2;1,4;1,-5;1,9;1,aa;1,d;1,-7;1,2;1,-4;1,5;1,-8;1,49;1,-1;1,-c;1,-3;1,a;1,-2;1,-3;1,c;1,-d;1,-3;1,-3;1,gg;1,5;1,-3;1,2;1,-3;1,-2;1,1n;1,-4;1,1d;1,-1;1,-2;1,2e;1,14;1,-5;1,5d;1,-8;1,7;1,-4;1,c;1,-6;1,5;1,75;1,1a;1,-a;1,7i;1,-6;1,n;1,-17;1,1k;1,-18;1,1d;1,-n;1,2;1,-r;1,-a;1,6;z,w;1,c;1,-1f;1,f;1,-y;1,1g;1,h;1,-1j;1,e;1,-4;1,n;1,-8;1,-6;1,u;1,-2;1,7;1,7;1,-1h;1,e;1,v;1,-10;1,x;1,ln;1,-1;1,28;1,6;1,-i;1,-9;1,4;1,d;1,-n;1,g;1,-h;1,5;1,f;1,-l;1,w;1,-c;1,8;1,6;1,-i;1,3;1,-a;1,f;1,-d;1,4;1,bz;1,1;1,15;1,8;1,1;1,-4;1,e;1,-f;1,e;1,-g;1,k;1,-5;1,-a;1,8;1,ba;1,fp;1,g;1,10;1,15;1,-1;1,5v;1,2;1,1p;1,2;1,-1;1,7v;1,2;1,8b;1,-9;1,d;1,-3;1,-4;1,9;1,-8;1,-6;1,68;1,a;1,-7;1,1;1,9;1,-4;1,6;1,-d;1,3;1,-4;1,5;1,8;1,30;1u,-2;1,1;1,3q;1,d;1,-8;1,w2;1,3;1,2l;1,fb;1,e4;1,28;1,-f5c;1,dt;1,-6;1,-9;1,-3;1,2;1,-d;1,-8;1,i;1,l;1,-16;1,5;1,-c;1,q;1,-h;1,o;1,-25;1,1c;1,q;1,a;1,2;1,-8;1,1;1,-u;1,-6;1,1a;1,5;1,-s;1,-6;1,an;1,4b;1,2;1,-1;1,2;1,2w;1,-3;1,2i;1,33;1,d5;1,1;1,-1m;1,h;1,3;1,-s;1,-a;1,13;1,h;1,-18;1,-1;1,-5;1,y;1,-d;z,-1l;1,12;1,1f;1,-n;1,-l;1,f;1,-r;1,e;1,5;1,b;1,cf;1,-3;1,6s;1,p;1,-1e;1,k;1,-q;1,o;1,c;1,-j;1,g;1,b;1,-g;1,j;1,-o;1,-10;1,1k;1,-p;1,-b;1,f;1,-d;1,7;1,-b;1,19;1,-i;1,k;1,-15;1,q;1,b;1,-r;1,-8;1,7;1,t;1,-9;1,9k;1,78;1,-8;1,-3;1,i;1,-9;1,-12;1,-3;1,1k;1,-t;1,f;1,6;1,7;1,-p;1,h;1,-d;1,-k;1,q;1,-b;1,-e;1,n;1,-j;1,1y;1,-28;1,f;1,-k;1,j;1,10;1,-7;1,-y;1,a;1,5;1,-k;1,q;1,7q;1,-4;1,2b;1,-1;1,49;1,5h;1,-j;1,i;1,-3;1,6;1,-k;1,s;1,-r;1,p;1,-1;1,-m;1u,x;1,-u;1,h;1,-4;1,f;1,7k;1,-a;1,3h;1,3;1,5;1,-7;1,1;1,3n;1,2;1,2r;1,-5;1,9;1,6j;1,6;1,-a;1,1k;1,-e;1,a;1,p;1,1;1,-5;1,l;1,-b;1,4;1,-l;1,-n;1,16;1,-10;1,j;1,-b;1,4;1,a;1,-d;1,he;1,1f;1,11;1,-8;1,-5;1,1s;1,-v;1,f;1,-g;1,-6;1,k;1,-t;1,-v;1,o;1,9;1,-y;1,1t;1,-1m;1,13;1,-1b;1,1t;1,-1e;1,14;1,-2x;1,2s;z,-13;1,d;1,-4;1,g;1,-4;1,-t;1,df;1,3e;1,48;1,-4;1,-6;1,-2;1,3;1,6;1,52;1,9t;1,e;1,9;1,c;1,-1b;1,1;1,1s;1,-3;1,4r;1,-6f;1,1g;1,9;1,-3;1,-1g;1,-1;1,1q;1,-z;1,-o;1,r;1,-m;1,-h;1,7;1,1k;1,-16;1,-f;1,d;1,t;1,-5;1,-b;1,l;1,-n;1,r;1,-18;1,3;1,m;1,-5;1,-2;1,-d;1,jd;1,-3;1,4;1,1;1,2h;1,-2;1,-2;1,1;1,-2;1,4e;1,ba;1,-l;1,9;1,-1;1,5d;1,-5k;1,1p;1,-7;1,-17;1,1r;1,-y;1,18;1,-1k;1,o;1,-1;1,-9;1,-o;1,13;1,-9;1,1;1,-2;1,p;1,-16;1,-d;1,1c;1,3;1,-1i;1,r;1,-j;1,d;1,-6;1u,7;1,y;1,-v;1,16;1,-12;1,-a;1,m;1,-14;1,n3;1,j;1,-m;1,w;1,-z;1,o;1,-s;1,k;1,-h;1,t;1,-k;1,3;1,7;1,d;1,-j;1,-8;1,-2;1,l;1,-9;1,c;1,a8;1,-3;1,1;1,3;1,4e;1,-6;1,-g;1,a;1,7;1,-e;1,-2;1,-9;1,g;1,f;1,2y;1,32;1,2;1,-3;1,f;1,-3;1,-4;1,a;1,-7;1,-6;1,2;1,3;1,d;1,-1;1,-n;1,k;1,9o;1,-1;1,2z;1,4;1,-3;z,-4;1,1;1,5;1,-1;1,5b;1,-6;1,22;1,2u;1,-a;1,-2;1,4;1,1;1,2;1,-1;1,a;1,-o;1,m;1,-6;1,7n;1,a;1,-9;1,4;1,-3;1,2;1,-12;1,v;1,b;1,7o;1,3;1,2;1,1;1,-7;1,8;1,-a;1,2i;1,1r;1,-2;1,-2;1,1;1,48;1,5;1,-4;1,4l;1,i;1,-j;1,-f;1,b;1,-e;1,2;1,f;1,-r;1,i;1,-d;1,k;1,-6;1,2;1,2;1,3;1,6;1,-u;1,9;1,a9;1,4;1,-2;1,d;1,42;1,8;1,-5;1,-2;1,4;1,b;1,-p;1,-3;1,o;1,6;1,-9;1,1;1,b;1,-f;1,-j;1,fv;1,1e;1,7;1,1;1,-2;1,1b;1,1;1,2;1,3;1,1;1,-a;1,8;1,-6;1,2e;1u,-1;1,-3;1,18;1,-4;1,5;1,5s;1,d;1,-c;1,2;1,i;1,-e;1,d;1,-e;1,3;1,-c;1,i;1,-a;1,5;1,6n;1,13;1,-5;1,7;1,-6;1,-2;1,1u;1,7w;1,j;1,5;1,-r;1,-j;1,-7;1,1d;1,-1c;1,r;1,-e;1,k;1,4;1,-10;1,v;1,l;1,-18;1,6;1,9;1,h;1,-2;1,f;1,-v;1,-d;1,13;1,a;1,-13;1,f;1,p;1,-1d;1,13;1,-v;1,13;1,-1k;1,10;1,jj;1,-3;1,2x;1,-8;z,b;1,-1;1,4;1,-b;1,-a;1,o;1,-f;1,-6;1,5;1,k;1,-o;1,7;1,1;1,7;1,-6;1,1;1,b8;1,1j;1,c;1,j;1,-6;1,8;1,-g;1,-9;1,g;1,-2;1,-7;1,f;1,-e;1,2;1,-4;1,d;1,8;1,-w;1,7;1,-5;1,6s;1,2c;1,3;1,-4;1,2j;1,-9;1,5;1,-e;1,ez;1,2;1,x;1,1;1,w;1,14;1,60;1,-2;1,-2;1,1v;1,6;1,-9;1,6;1,2;1,7r;1,6;1,-1;1,-1;1,-5;1,9;1,1;1,8z;1,-p;1,6;1,b;1,-g;1,l;1,5q;1,-5;1,6;1,4;1,-2;1,1;1,-v;1,n;1,1;1,-3;1,31;1,2;1,2;1,-7;1,2;1,47;1,8;1,-3;1,2;1,5;1,-k;1,l;1,-f;1u,1;1,c;1,-f;1,6;1,p8;1,c;1,2;1,6s;1,-f;1,-2;1,6;1,-2;1,28;1,4r;1,4a;1,69;1,4y;1,-ef0;1,-6;1,-1;1,a;1,-j;1,o;1,-w;1,9;1,2;1,f;1,-1h;1,1g;1,-a;1,-g;1,5;1,60;1,39;1,8u;1,-1;1,43;1,3;1,dm;1,n;1,-3;1,8;1,-1i;1,5q;1,-4j;1,-f;1,-b;1,7;1,12;1,-1g;1,y;1,-h;1,i;1,-13;1,f;1,q;1,-13;1,m;1,c;1,-j;1,am;1,7x;1,e;z,-u;1,5;1,9;1,-4;1,5;1,-1f;1,2b;1,-z;1,-9;1,-1;1,o;1,c;1,-9;1,-8;1,b;1,-1;1,-b;1,-1;1,f;1,86;1,9a;1,-r;1,b;1,-11;1,14;1,-4;1,-12;1,1a;1,-16;1,15;1,7;1,-n;1,p;1,-3b;1,25;1,6;1,d;1,-k;1,8;1,u;1,-1a;1,2;1,f;1,g;1,-d;1,4;1,a;1,99;1,-t;1,-2;1,9;1,-3;1,-7;1,4;1,1q;1,10;1,7b;1,c;1,14;1,-16;1,a;1,-c;1,-a;1,s;1,-3;1,7;1,-y;1,7;1,o;1,-l;1,-c;1,14;1,-n;1,-9;1,g;1,-h;1,4;1,-a;1,4;1,a;1,5;1,73;1,-3;1,7r;1,26;1,-1;1,6;1,7y;1,-g;1,j;1,m;1,-k;1,-a;1,28;1u,-y;1,o;1,c;1,-h;1,-g;1,u;1,-r;1,4;1,2;1,-1p;1,1u;1,l;1,5;1,-d;1,-h;1,5;1,7;1,8v;1,96;1,t;1,-1;1,u;1,n;1,3;1,7;1,-18;1,62;1,-4q;1,-15;1,m;1,m;1,-x;1,t;1,3;1,30;1,-3m;1,-x;1,v;1,-1;1,-o;1,k;1,-5;1,-h;1,5;1,5;1,-1;1,-3;1,14;1,-p;1,2;1,9l;1,1h;1,3;1,-6;1,-8;1,c;1,-3;1,13;1,h;1,1;1,g;1,y;1,2;z,4q;1,-g;1,f;1,5;1,-f;1,8;1,-f;1,8;1,3z;1,ej;1,-1l;1,1d;1,-14;1,26;1,-1q;1,-2;1,7;1,u;1,-1l;1,x;1,-c;1,-7;1,i;1,t;1,-3;1,-t;1,-i;1,12;1,-1n;1,1o;1,2w;1,-58;1,2l;1,-y;1,-15;1,26;1,-s;1,-14;1,19;1,-1;1,-k;1,z;1,-1;1,d;1,-21;1,-6;1,l;1,1;1,8;1,e;1,-z;1,1h;1,-1e;1,l;1,18;1,g;1,-2m;1,he;1,2;1,4;1,-3;1,2g;1,3;1,2;1,-4;1,14;1,1f;1,2;1,1;1,1p;1,cs;1,22;1,1;1,-14;1,16;1,1r;1,-24;1,1;1,8;1,t;1,-1j;1,k;1,2;1,s;1,m;1,-2f;1,n;1,o;1,-b;1,h;1,-m;1,-1k;1,17;1,1c;1u,a;1,-c;1,5;1,-1c;1,-9;1,1k;1,h;1,-6;1,-1e;1,-n;1,e;1,z;1,i;1,-1q;1,29;1,-k;1,j;1,-y;1,10;1,-13;1,k;1,-1d;1,1;1,10;1,jq;1,-2;1,h;1,-1g;1,1f;1,3;1,-e;1,2;1,-3;1,g;1,-j;1,9;1,i;1,-v;1,8g;1,f;1,1a;1,1;1,-3;1,-1;1,6;1,3r;1,-7;1,11;1,-e;1,f;1,2;1,-c;1,b;1,-5;1,-7;1,-3;1,i;1,-15;1,82;1,-2;1,4;1,-5;1,-l;z,4;1,7;1,c;1,4;1,-d;1,-1;1,-6;1,c;1,-9;1,i;1,5l;1,1g;1,1s;1,-3;1,3f;1,-d;1,7;1,5;1,-9;1,2;1,5;1,-d;1,5a;1,-3;1,20;1,30;1,1;1,-3;1,9;1,-8;1,5;1,4;1,-3;1,1;1,42;1,e;1,38;1,4;1,1;1,-9;1,h;1,4;1,-7;1,4;1,2;1,-7;1,-1;1,-a;1,4;1,7m;1,-1;1,-1;1,-2;1,42;1,8;1,-7;1,9;1,-8;1,45;1,25;1,-2;1,2u;1,-f;1,9;1,4;1,4;1,2;1,-e;1,o;1,-j;1,9p;1,-4;1,a;1,-7;1,53;1,n;1,-c;1,-g;1,3;1,h;1,3;1,-r;1,u;1,-h;1,f;1,-p;1,2;1,l;1,-o;1,e;1,-h;1,ds;1,1;1,12;1u,1;1,1o;1,-2;1,1;1,1i;1,3e;1,-2;1,1;1,4u;1,-16;1,33;1,7;1,8;1,-3;1,-8;1,-a;1,g;1,-j;1,4s;1,8;1,9;1,1;1,1;1,b;1,1k;1,1;1,2;1,1i;1,5i;1,44;1,16;1,16;1,-2r;1,14;1,16;1,-17;1,-3;1,o;1,-6;1,q;1,-22;1,2;1,z;1,-8;1,-10;1,1u;1,-10;1,8;1,-d;1,13;1,-u;1,-m;1,3;1,8;1,v;1,-18;1,1s;1,6;1,-1d;1,1f;1,-b;1,-1w;1,1d;z,-u;1,11;1,-1f;1,a;1,p;1,15;1,-28;1,15;1,2;1,-16;1,1j;1,-10;1,b;1,1l;1,-1s;1,z;1,ka;1,a;1,4;1,-j;1,g;1,-9;1,g;1,-d;1,e;1,-f;1,g;1,-3;1,-i;1,h;1,-n;1,af;1,e;1,-1;1,2t;1,t;1,-u;1,-1;1,8;1,-2;1,-8;1,6;1,-5;1,6;1,-b;1,27;1,-1k;1,5o;1,3;1,-1;1,1y;1,-3;1,1;1,37;1,-1;1,-k;1,w;1,-p;1,n;1,1;1,-k;1,1;1,d;1,-a;1,9;1,-7;1,2;1,3;1,eo;1,y;1,-1;1,1m;1,4;1,-e;1,9;1,-4;1,5r;1,-4;1,9;1,27;1,-5;1,-6;1,-6;1,f;1,6;1,-d;1,6;1,4;1,-h;1,f;1,-i;1,8a;1,8;1,3;1u,-1;1,-j;1,8;1,-9;1,g;1,-e;1,1;1,e;1,-b;1,6;1,-5;1,8;1,-b;1,90;1,7;1,-5;1,5z;1,12;1,-14;1,-5;1,-3;1,c;1,-f;1,2;1,6;1,-1;1,7;1,-2;1,-2;1,2m;1,3;1,-5;1,3;1,-2;1,4h;1,9;1,r;1,-y;1,n;1,c;1,-n;1,-3;1,-c;1,i;1,-j;1,-2;1,9;1,-2;1,z;1,-11;1,q;1,8;1,-b;1,-2;1,-i;1,h;1,o5;1,i;1,-1;1,4;1,6v;1,-9;1,a;z,1;1,-6;1,-3;1,1u;1,6;1,-5;1,1a;1,-1;1,3g;1,4;1,-2;1,49;1,4i;1,1u;1,sb;1,er;1,-fw6;1,1;1,1e;1,ef;1,2;1,7;1,-o;1,m;1,6;1,-m;1,k;1,-6;1,-i;1,h;1,-7;1,-9;1,q;1,-2;1,-j;1,2;1,7z;1,4j;1,-2;1,3;1,1;1,nb;1,o;1,-f;1,4;1,-5;1,-1;1,j;1,-t;1,k;1,-g;1,11;1,-16;1,j;1,-1x;1,1u;1,6;1,d;1,-c;1,-e;1,16;1,-11;1,c;1,-n;1,9e;1,8v;1,l;1,-4;1,-l;1,-2;1,-4;1,12;1,-q;1,-7;1,f;1,-4;1,c;1,-a;1,-u;1,12;1,e;1,3v;1,cr;1,-3;1,7;1,-h;1,-2;1,-7;1,4;1,-5;1,f;1,9;1,-d;1,b;1u,-f;1,9;1,a;1,-m;1,2;1,n;1,-k;1,-15;1,92;1,2;1,1;1,1y;1,k;1,8u;1,-e;1,-p;1,r;1,d;1,-6;1,-e;1,a;1,-1;1,-5;1,3y;1,2n;1,-1;1,-4;1,3;1,-2;1,3e;1,7;1,-6;1,5;1,-4;1,3d;1,33;1,-2;1,96;1,2a;1,1;1,-v;1,q;1,-f;1,-4;1,-4;1,o;1,-n;1,w;1,-12;1,n;1,68;1,9c8;1,-9c5;1,2;1,-1;1,bl;1,18;1,-6;1,11;1,2;1,-9;1,n;1,4;z,f;1,g;1,-10;1,-a;1,3;1,x;1,-2;1,-l;1,1;1,-n;1,q;1,a;1,-8;1,p;1,-c;1,-6;1,-11;1,g;1,12;1,-r;1,2;1,-s;1,-10;1,1g;1,j;1,-d;1,-j;1,9t;1,z;1,1t;1,4z;1,6;1,9;1,-5;1,-5;1,-1;1,f;1,-5;1,-s;1,4o;1,g6;1,-7;1,-13;1,m;1,k;1,f;1,-1e;1,6;1,11;1,-1d;1,9;1,l;1,2;1,x;1,-1e;1,1;1,-k;1,1j;1,-1l;1,a;1,14;1,-39;1,3s;1,-1w;1,1h;1,-15;1,1b;1,-17;1,1e;1,-u;1,-n;1,1f;1,-14;1,-h;1,g;1,-k;1,11;1,-d;1,2;1,-v;1,w;1,-z;1,24;1,-1r;1,ei;1,-1;1,-2;1,-1;1,6;1,-7;1,2i;1,s4y;1,-s2a;1,1;1u,-3;1,-2;1,1;1,ir;1,1n;1,-e;1,-1l;1,1d;1,-x;1,-c;1,1;1,c;1,h;1,8;1,d;1,c;1,-l;1,4;1,-z;1,17;1,-i;1,-7;1,t;1,-13;1,15;1,-t;1,c;1,5;1,p;1,-4;1,-1r;1,-7;1,-4;1,-1;1,n;1,-3;1,u;1,-c;1,t;1,-6;1,-1f;1,n;1,-b;1,is;1,d;1,-2;1,h;1,-3;1,-v;1,s;1,5;1,g;1,6;1,-e;1,-9;1,-v;1,m;1,-l;1,8;1,11;1,-h;1,-f;1,3;z,-f;1,9;1,d;1,6t;1,1q;1,-1;1,5;1,-1;1,-2;1,4u;1,6;1,-7;1,-1;1,6;1,a;1,-1;1,6z;1,6;1,1;1,7;1,-1;1,6;1,-n;1,f;1,1;1,-2;1,-c;1,4;1,7;1,7;1,3x;1,u;1,-1;1,-1;1,w;1,2k;1,-2;1,-2d0;1,2gc;1,w;1,-c;1,-c;1,7;1,-2;1,-3;1,-1;1,o;1,-l;1,-5;1,-9;1,8;1,8;1,4c;1,s;1,14;1,3c;1,a;1,1;1,-e;1,4;1,4;1,f;1,-2;1,-j;1,5;1,k;1,37;1,4n;1,j;1,-6;1,-5;1,-b;1,h;1,-g;1,1;1,r;1,-u;1,-a;1,w;1,-p;1,m;1,-r;1,75;1,6;1,-5;1,-4;1,48;1,7;1,1;1,-7;1,5;1,-2;1,d;1,-f;1u,8;1,-b;1,43;1,-1;1,-4;1,25;1,3f;1,-2;1,9;1,7;1,-b;1,9;1,-d;1,e;1,-2;1,-1;1,-f;1,n;1,-2;1,-j;1,9b;1,2;1,-5;1,61;1,-2;1,-6;1,d;1,-e;1,6;1,-b;1,k;1,-j;1,8;1,-7;1,g;1,8;1,-g;1,-7;1,l;1,d7;1,-2;1,-4;1,1;1,4;1,1m;1,-1;1,2;1,1g;1,1;1,1x;1,8z;1,-4;1,n;1,-r;1,d;1,-e;1,7;1,g;1,-575;1,56l;1,o;1,-f;1,8;z,-17;1,t;1,58;1,18;1,-5;1,-4;1,2;1,3;1,j0;1,-4y;1,n;1,w;1,3;1,m;1,-2;1,-14;1,-k;1,-h;1,1y;1,-v;1,-1j;1,t;1,1c;1,-z;1,-1;1,r;1,-1;1,-m;1,4q;1,-4p;1,-13;1,3;1,-6;1,1y;1,-1j;1,1h;1,-1y;1,j;1,-s;1,-28;1,36;1,-s;1,j;1,-l;1,1e;1,h;1,-1j;1,l;1,-2;1,6;1,t;1,2e;1,-1j;1,-2b;1,c;1,-h;1,-3;1,1h;1,m;1,-1m;1,-p;1,1h;1,-c;1,q;1,-u;1,jf;1,-7;1,-d;1,l;1,-i;1,-10;1,v;1,2g;1,-2d;1,m;1,-5;1,-8;1,-b;1,n;1,-8;1,cx;1,-b;1,2;1,1;1,g;1,-3;1,-1;1,-e;1,4;1,51;1,m;1,1w;1,6;1,-1;1u,-3;1,-1;1,2;1,-6;1,a;1,40;1,g;1,-7;1,-u;1,-y;1,1k;1,b;1,2;1,-f;1,e;1,-2;1,-d;1,6;1,ci;1,f;1,-1;1,r;1,-1;1,2;1,w;1,-2;1,1;1,1z;1,4c;1,1;1,14;1,-5;1,2;1,1;1,-2;1,6;1,1;1,-4;1,2;1,2m;1,-g;1,c;1,5;1,-3;1,-u;1,p;1,-6;1,-1;1,5;1,b;1,-7;1,9;1,7m;1,-7;1,2;1,-1;1,5;1,2;1,1;1,-6;1,9;1,93;1,-j;z,5;1,5;1,-c;1,5v;1,-3;1,2;1,2;1,5;1,-2;1,-9;1,3;1,2o;1,1;1,61;1,a;1,-y;1,a;1,18;1,-1f;1,1e;1,-7;1,11;1,-2d;1,s;1,-4;1,13;1,-1;1,-t;1,h;1,7;1,8;1,-1l;1,17;1,f;1,-1r;1,z;1,f;1,-j;1,y;1,-10;1,5;1,-7;1,a;1,-10;1,od;1,-3;1,2;1,-3;1,6v;1,1;1,-2;1,6;1,1j;1,18;1,3;1,-5;1,-3;1,3i;1,4;1,1;1,-6;1,4d;1,-2;1,1;1,4e;1,22;1,3;1,52;1,3;1,-2;1,5;1,6w;1,-2;1,4w;1,b3;1,3;1,-6;1,bd;1,3h;1,-ffb;1,-i;1,3;1,h;1,b;1,-o;1,f;1,-d;1,7;1,-h;1,p;1,4;1,-1;1,-c;1,-3;1u,6w;1,4o;1,1;1,2w;1,2;1,1x;1,3g;1,hn;1,-i;1,-9;1,6;1,-m;1,j;1,d;1,-r;1,i;1,-h;1,-8;1,z;1,-p;1,-5;1,-6;1,i8;1,-d;1,k;1,8;1,-i;1,-5;1,-2;1,-b;1,n;1,-h;1,d;1,a;1,-3;1,-o;1,c;1,6;1,-d;1,p;1,-5;1,33;1,31;1,a9;1,i;1,-9;1,-g;1,l;1,-g;1,j;1,-2;1,8;1,-h;1,-2;1,-5;1,h;1,-e;1,-1;1,-4;1,f;1,-9;1,48;1,2x;z,3;1,3k;1,7z;1,-2;1,-3;1,9;1,-c;1,7;1,-a;1,j;1,-1;1,-1;1,-a;1,-2;1,h;1,-k;1,6;1,61;1,1;1,-6;1,3p;1,-7;1,6;1,-9;1,e;1,-7;1,4;1,-7;1,2;1,34;1,-1;1,18;1,1z;1,ae;1,-4;1,p;1,t;1,j;1,2;1,-x;1,1;1,v;1,-6;1,k;1,-c;1,-w;1,12;1,-v;1,a;1,-16;1,1b;1,-9;1,-b;1,5v;1,-2;1,4;1,e8;1,y;1,e;1,2;1,n;1,2;1,-4;1,1;1,a;1,-8;1,-f;1,1s;1,-2g;1,1g;1,-10;1,-2;1,-h;1,8;1,d;1,-g;1,1b;1,-1s;1,19;1,-1;1,-i;1,c;1,i;1,70;1,19;1,75;1,-1;1,-1;1,2u;1,-1;1,u;1,i7;1,5;1,j;1u,-15;1,1a;1,-1k;1,q;1,-4;1,g;1,-17;1,8;1,-b;1,p;1,-q;1,s;1,l;1,-f;1,g;1,5;1,-7;1,-p;1,1c;1,-r;1,h;1,-1c;1,1h;1,-s;1,-w;1,n;1,-9;1,-3;1,1n;1,-1u;1,-7;1,1e;1,-d;1,-g;1,x;1,as;1,3;1,-2;1,2b;1,1;1,1;1,z;1,1;1,1m;1,k0;1,13;1,-4;1,i;1,y;1,-19;1,1r;1,-1o;1,1f;1,-11;1,1x;1,-1h;1,1;1,d;1,-f;1,z;1,-15;1,-11;1,t;z,18;1,1p;1,-3e;1,-b;1,1r;1,j;1,-g;1,c;1,-7;1,-22;1,s;1,7;1,1h;1,-1q;1,-8;1,-7;1,1v;1,-t;1,-w;1,1q;1,-r;1,-i;1,h;1,-m;1,p;1,h2;1,9;1,-7;1,-9;1,5;1,-3;1,d;1,-k;1,b;1,-5;1,m;1,4t;1,f;1,1w;1,-2;1,-2;1,4w;1,a;1,4;1,-5;1,7q;1,h;1,-2;1,4;1,-3;1,-b;1,7;1,42;1,2;1,1;1,3e;1,j;1,3q;1,-e;1,4;1,9;1,-4;1,-7;1,a;1,4k;1,5l;1,-5;1,9;1,-3;1,-k;1,i;1,-h;1,f;1,5;1,8f;1,-8;1,a;1,-7;1,-5;1,-16;1,19;1,-d;1,7;1,-5;1,c;1,-a;1,2;1,6s;1,-e;1,1;1,b;1,-1;1,-1;1,-1;1u,4;1,-f;1,a;1,-2;1,4b;1,v;1,-q;1,-1;1,-7;1,-2;1,3m;1,3;1,1;1,1u;1,4a;1,k;1,-i;1,7;1,-1;1,6;1,-9;1,-1;1,f;1,-d;1,-9;1,j;1,-844;1,845;1,b;1,-y;1,8p;1,4;1,-3;1,-2;1,6l;1,g;1,b;1,-v;1,7;1,n;1,-1;1,5;1,-14;1,1d;1,-a;1,2;1,5;1,1;1,-t;1,a;1,-z;1,12;1,-t;1,7;1,8;1,-5;1,-8;1,14;1,bu;1,33;1,1;1,2;1,-7;z,1y;1,1l;1,-1;1,8d;1,-3;1,-3;1,4;1,6;1,-1;1,-1;1,3u;1,hu;1,d;1,-3;1,-2;1,r;1,k;1,-c;1,-m;1,2;1,-3;1,e;1,-5;1,d;1,c;1,-z;1,-g;1,n;1,v;1,-1f;1,a;1,k;1,-p;1,-e;1,1f;1,5;1,-1d;1,e;1,6;1,-7;1,1a;1,-1q;1,u;1,p;1,-1b;1,1j;1,-3;1,-2;1,9;1,-17;1,-v;1,cw;1,5u;1,-g;1,5;1,1v;1,-17;1,-i;1,-g;1,3;1,-8;1,2;1,14;1,-n;1,l;1,-3;1,8;1,-12;1,i;1,-8;1,3;1,f;1,-16;1,14;1,-9;1,4;1,d;1,-s;1,1;1,h;1,-k;1,-a;1,m;1,-v;1,di;1,-g;1,a;1,1;1,8;1,4;1,-g;1,e;1,-6;1,5;1u,-b;1,-4;1,-1;1,4y;1,4;1,-2;1,-1;1,23;1,2;1,-3;1,5f;1,-i;1,-e;1,7;1,-3;1,7;1,br;1,17;1,1;1,30;1,-6;1,8;1,5b;1,37;1,-7;1,-3;1,e;1,-g;1,d;1,-7;1,4;1,-1;1,-1;1,-7;1,2;1,4;1,7g;1,1;1,-3;1,-1;1,eu;1,-7;1,4;1,2;1,-3;1,-2;1,-3;1,a;1,-3;1,-6;1,2n;1,-8;1,7;1,-6;1,8i;1,-1;1,-1a;1,11;1,-x;1,12;1,-c;1,m;1,-t;z,p;1,-c;1,h;1,-1e;1,u;1,-o;1,10;1,23;1,-2o;1,-c;1,j;1,d;1,-11;1,b;1,p;1,-n;1,-4;1,6;1,d;1,e;1,-15;1,9;1,y;1,-c;1,-i;1,-2m;1,vl;1,3;1,2m;1,2h;1,11;1,-3;1,4;1,5;1,-3;1,2;1,-7;1,9;1,-3;1,-2;1,27;1,-1;1,21;1,47;1,1;1,2c;1,-2;1,7;1,46;1,-1;1,13;1,-a;1,2;1,-1;1,8;1,-5;1,a;1,6i;1,1e;1,4;1,2f;1,1;1,x;1,1;1,-2;1,b6;1,1;1,3;1,c2;1,-fc8;1,4;1,19;1,-1k;1,e;1,1;1,-h;1,8;1,d;1,1;1,-f;1,d;1,ap;1,1;1,2t;1,-2;1,nt;1,-6;1,a;1,-n;1,c;1,9;1,-1;1,-3;1,i;1u,2;1,-q;1,-d;1,a;1,-h;1,i;1,-6;1,-e;1,g;1,68;1,b5;1,-e;1,k;1,-h;1,3;1,c;1,-3;1,-7;1,-4;1,2m;1,e8;1,-b;1,9;1,-6;1,-1;1,d;1,-b;1,a;1,-9;1,8;1,6;1,-2;1,a;1,9k;1,8i;1,-2;1,8;1,-d;1,g;1,-f;1,2;1,b;1,-4;1,5;1,-7;1,4;1,5n;1,-c;1,3;1,-4;1,68n;1,-654;1,3;1,3;1,2w;1,2x;1,d5;1,-8;1,-a;1,1k;1,-1;1,-e;1,-p;z,i;1,-8;1,s;1,-2;1,-e;1,-d;1,o;1,-9;1,-k;1,-13;1,25;1,3e;1,g1;1,2;1,12;1,a;1,-r;1,i;1,5;1,-d;1,-4;1,-1;1,2;1,n;1,-4;1,-1j;1,21;1,-p;1,66;1,4;1,-1;1,2;1,1j;1,1;1,76;1,-5;1,-7;1,9;1,5;1,-d;1,5;1,nl;1,6;1,h;1,-1e;1,j;1,t;1,-10;1,-d;1,1o;1,-x;1,-j;1,-a;1,1l;1,2;1,-v;1,15;1,-1h;1,-4;1,12;1,-t;1,-g;1,2h;1,-1k;1,-y;1,l;1,i;1,-h;1,-h;1,u;1,-5;1,k;1,d;1,-m;1,-p;1,1c;1,-v;1,-j;1,y;1,8r;1,2c;1,-2;1,-1;1,4;1,2j;1,-1;1,-1;1,3;1,n3;1,-r;1,2g;1,9;1,1r;1,-1g;1u,-5;1,-4;1,3;1,-16;1,-j;1,1i;1,-17;1,1o;1,-w;1,-a;1,m;1,-19;1,t;1,-w;1,-2;1,7;1,1p;1,-1;1,-1i;1,-2l;1,2p;1,a;1,i;1,-m;1,15;1,-1p;1,1k;1,-y;1,m;1,m;1,-1e;1,k;1,-d;1,h;1,fr;1,-3;1,-k;1,l;1,-g;1,-6;1,f;1,c;1,-o;1,8;1,-7;1,6;1,-3;1,9;1,-e;1,b;1,c;1,6d;1,2;1,5a;1,-6;1,c;1,1;1,1;1,-3;1,-2;1,6;1,-7;1,-1;z,9;1,85;1,2;1,1;1,-4;1,-5;1,-4;1,8;1,3;1,-c;1,-3;1,3z;1,-1;1,3b;1,4n;1,-7;1,-5;1,4;1,-1;1,7;1,-9;1,e;1,-d;1,3l;1,1;1,1;1,-3;1,6q;1,2;1,-6;1,-1;1,91;1,-i;1,k;1,-3;1,5;1,-3;1,6;1,-c;1,-5;1,1;1,5;1,5t;1,7;1,-1;1,-4;1,6;1,-7;1,-2sl;1,2wz;1,3d;1,2;1,-1;1,78;1,k;1,-d;1,-i;1,y;1,-v;1,a;1,h;1,-l;1,7k;1,3;1,4;1,-1;1,8c;1,-s;1,f;1,-3;1,-g;1,a;1,y;1,-9;1,-k;1,g;1,-5;1,-1;1,-2;1,-f;1,bb;1,1i;1,4;1,-3;1,1s;1,-2;1,-1;1,2;1,-6;1,2;1,3g;1,3;1,8s;1,-4;1u,-1;1,-9;1,d;1,-9;1,-2;1,3j;1,1l;1,4;1,-1;1,-2;1,-2;1,3;1,k3;1,n;1,-18;1,-f;1,15;1,-r;1,-5;1,4;1,i;1,-l;1,t;1,-b;1,-x;1,1c;1,-1d;1,e;1,4;1,-o;1,1i;1,-1k;1,z;1,-u;1,-c;1,8;1,9;1,m;1,-14;1,-1;1,19;1,-o;1,16;1,-b;1,h;1,-18;1,-5;1,x;1,-14;1,1n;1,-b;1,-1r;1,1;1,8;1,-1;1,a;1,v;1,8;1,g;1,-11;1,e;1,m;1,8j;z,6s;1,d;1,1;1,j;1,2y;1,-32;1,-r;1,-4;1,7;1,-9;1,f;1,-7;1,-9;1,d;1,f;1,-3;1,-q;1,-2;1,h;1,-2;1,i;1,-3;1,e;1,-c;1,-i;1,9;1,-m;1,18;1,-6;1,-j;1,5;1,2;1,6p;1,4r;1,7;1,8;1,-9;1,c;1,1;1,1;1,-j;1,g;1,-5;1,-3;1,-5;1,49;1,2;1,-1;1,22;1,3;1,-4;1,6b;1,-9;1,-e;1,r;1,-2;1,3;1,1;1,-q;1,s;1,-p;1,2;1,5;1,j;1,-l;1,-9;1,3;1,s;1,9x;1,f;1,1u;1,2e;1,-6;1,-6;1,f;1,-e;1,3;1,a;1,55;1,-4;1,5;1,-6;1,3p;1,3;1,2;1,-1;1,a;1,-p;1,6;1,-5;1,-5;1,8;1,d;1,1;1u,-j;1,-2;1,6;1,-5;1,9;1,-5;1,3;1,7m;1,-8;1,-c;1,2;1,6;1,3;1,-d;1,1;1,9o;1,-3;1,-1;1,-8;1,4;1,5g;1,-4;1,-2;1,1;1,8;1,-c;1,8;1,2f;1,1;1,4;1,-9;1,1;1,2;1,-4;1,9c;1,-d;1,1;1,-4;1,p;1,-z;1,p;1,y;1,-i;1,-7;1,h;1,-i;1,6;1,-h;1,z;1,-19;1,12;1,-u;1,-2;1,6;1,o;1,-p;1,8;1,-c;1,n;1,-2;1,9;1,-m;1,2;z,-u;1,18;1,-r;1,-i;1,js;1,1c;1,-1;1,3;1,2;1,6s;1,-2;1,1d;1,1e;1,3;1,-6;1,2g;1,1c;1,4;1,-6;1,20;1,-1;1,27;1,-1;1,9;1,3;1,-1;1,-8;1,-5;1,c;1,3v;1,2e;1,-e;1,n;1,3;1,2;1,1;1,-2;1,5j;1,-f;1,2;1,4;1,1;1,-6;1,-5;1,d;1,2;1,-d;1,c;1,-b;1,6f;1,1l;1,-1;1,8;1,-1;1,-1;1,2d;1,-3;1,10;1,d;1,-3;1,-b;1,g;1,-1;1,-5;1,-8;1,-4;1,8;1,b4;1,-2;1,3;1,2;1,-8;1,g;1,-7;1,-7;1,2;1,d;1,-3;1,-1;1,an;1,28;1,1o;1,1;1,-fec;1,-9;1,4;1,3;1,-9;1,5p;1,9i;1,4t;1,i7;1,-g;1,e;1u,5;1,-d;1,-3;1,a;1,5;1,-k;1,p;1,4l;1,-1;1,bx;1,-b;1,c;1,-a;1,-5;1,8;1,-6;1,a;1,gh;1,2;1,2;1,6;1,-d;1,-1;1,-3;1,6;1,i;1,-e;1,6;1,-2;1,5t;1,cd;1,5;1,-8;1,-2;1,e;1,-5;1,-2;1,-4;1,-2;1,a;1,-5;1,2;1,5;1,4z;1,1;1,-2;1,9;1,3e;1,-2;1,-1;1,2;1,-3;1,2u;1,35;1,dd;1,b;1,-i;1,1b;1,-h;1,i;1,-5;1,b;1,-i;z,5;1,-7;1,-18;1,nf;1,-1;1,-6;1,-1;1,-6;1,-c;1,-1g;1,1m;1,o;1,o;1,-q;1,2i;1,24;1,-3;1,12;1,86;1,-a;1,2;1,a;1,1;1,4;1,-i;1,-2;1,-1;1,i;1,2f;1,lt;1,1e;1,-t;1,u;1,-1h;1,1i;1,-16;1,v;1,g;1,9;1,-r;1,-a;1,-15;1,1e;1,-v;1,4;1,2;1,15;1,-6;1,-k;1,-1;1,5;1,r;1,-6;1,-9;1,-10;1,y;1,-8;1,-1;1,-8;1,1;1,-8;1,7j;1,-1;1,2;1,29;1,3;1,1;1,t;1,-1;1,1p;1,-1;1,3;1,pz;1,u;1,-14;1,10;1,-b;1,i;1,-6;1,-2y;1,2u;1,-7;1,-v;1,18;1,-y;1,2k;1,-2n;1,9;1,c;1,-e;1,-2;1,11;1,-g;1,-7;1u,-m;1,13;1,-u;1,y;1,-u;1,3;1,-2;1,et;1,-3;1,-3;1,-7;1,u;1,-m;1,1;1,a;1,9;1,-a;1,-3;1,8;1,-i;1,r;1,-s;1,a;1,k;1,1;1,5e;1,1;1,5n;1,-3;1,1;1,5;1,-7;1,6;1,-1;1,7p;1,r;1,6;1,-c;1,-2;1,3;1,c;1,2y;1,39;1,4v;1,-2;1,4;1,c;1,-a;1,9;1,-7;1,-3;1,-2;1,3v;1,17;1,50;1,3;1,4;1,-5;1,-1;1,7;1,1;1,-e;1,4;z,-2;1,92;1,c;1,-4;1,5;1,-c;1,5;1,-8;1,6;1,1;1,b;1,-e;1,1;1,5g;1,4g;1,4;1,-1;1,33;1,2;1,-3;1,-4;1,6;1,87;1,5;1,4;1,-a;1,-8;1,g;1,-b;1,e;1,h;1,-11;1,m;1,-8;1,-6;1,f;1,-j;1,7;1,6r;1,2;1,3;1,-7;1,1;1,8x;1,f;1,-a;1,-b;1,j;1,1;1,-d;1,-5;1,e;1,-7;1,5;1,8;1,-n;1,4;1,7;1,-9;1,7;1,h;1,-1;1,7z;1,1k;1,1;1,-2;1,1j;1,1q;1,1n;1,-1;1,1v;1,91;1,-b;1,8;1,b;1,-4;1,-a;1,5;1,-4;1,8;1,-2;1,5;1,-g;1,23;1,2r;1,1;1,1;1,lb;1,-h;1,12;1,-u;1,6;1,e;1,-9;1u,-o;1,6;1,u;1,-z;1,x;1,-u;1,d;1,-a;1,s;1,-11;1,t;1,m;1,-z;1,w;1,7;1,-w;1,i;1,-7;1,18;1,-12;1,-9;1,-9;1,h;1,7;1,6v;1,2;1,-1;1,8n;1,-c;1,8;1,-4;1,-1;1,-a;1,-7;1,l;1,2;1,-v;1,e;1,s;1,-u;1,b;1,1;1,c;1,-p;1,g;1,8;1,-2;1,-h;1,b9;1,8;1,a;1,-3;1,1;1,-7;1,a;1,-f;1,7;1,-6;1,c;1,-3;1,-d;1,5u;1,6n;z,2;1,g;1,2;1,1;1,-o;1,1j;1,-1c;1,-5;1,h;1,-14;1,m;1,3;1,7;1,n;1,-g;1,c;1,ba;1,1;1,-2;1,2t;1,-7;1,3;1,-1;1,3;1,3d;1,2;1,1j;1,2;1,3w;1,b;1,-6;1,8;1,5;1,-f;1,6;1,1;1,4;1,-h;1,f;1,3i;1,3d;1,-8;1,7;1,-3;1,7;1,-2;1,-3;1,8y;1,3;1,2;1,b;1,38;1,1l;1,2;1,1;1,2l;1,-3;1,1;1,-4;1,2;1,bc;1,-9;1,-m;1,n;1,-p;1,9;1,2z;1,-1u;1,4;1,-x;1,8;1,-h;1,-h;1,1x;1,-p;1,-v;1,-1;1,-1u;1,2a;1,-z;1,17;1,-i;1,-q;1,-2;1,1p;1,-1e;1,y;1,-11;1,16;1,g;1,-4;1,-b;1,-m;1,-8;1u,-1;1,-d;1,b;1,-9;1,-5;1,r;1,iu;1,h;1,-f;1,-5;1,1;1,-4;1,9;1,-a;1,8;1,6k;1,17;1,1j;1,7;1,-2;1,3t;1,-2;1,-3;1,2k;1,8;1,1p;1,-6;1,3;1,6q;1,-5;1,8;1,2;1,39;1,28;1,-2;1,-7;1,-1;1,c;1,-d;1,7;1,-1;1,-2;1,5u;1,6;1,-b;1,7;1,1n;1,4;1,-1;1,-2;1,1o;1,25;1,5;1,2;1,-b;1,2;1,-3;1,7;1,h;1,-1;1,-2;1,-m;1,r;z,-o;1,b;1,bh;1,-e;1,9;1,-2;1,-a;1,l;1,-c;1,-5;1,a;1,-i;1,9;1,6;1,a1;1,-2;1,1;1,13;1,-1;1,14;1,1;1,10;1,o;1,17;1,-ffb;1,-1;1,-3;1,2;1,-4;1,9;1,cr;1,pr;1,-7;1,1;1,-7;1,-2;1,-1;1,-5;1,4;1,-3;1,2;1,gl;1,-2;1,-5;1,3;1,gr;1,-8;1,d;1,-f;1,9;1,-5;1,-1;1,9;1,-1;1,25;1,3a;1,1;1,cl;1,51;1,-2;1,9g;1,-3;1,eg;1,-e;1,7;1,17;1,-7;1,5;1,-1;1,4;1,-a;1,lt;1,-6;1,-6;1,8;1,-7;1,4;1,49;1,-1;1,1i;1,10;1,6w;1,qj;1,9;1,-l;1,10;1,-s;1,m;1,-4;1,6;1,-3;1,-n;1,c;1,-5;1u,7;1,-i;1,11;1,-4;1,-j;1,-i;1,13;1,-c;1,-l;1,7;1,6;1,5l;1,2a;1,2k;1,qr;1,-z;1,23;1,-w;1,f;1,-7;1,h;1,-6;1,-1;1,-8;1,k;1,-l;1,5;1,6;1,e1;1,g;1,-9;1,a;1,-e;1,c;1,-e;1,b5;1,-5;1,1;1,88;1,r;1,-7;1,-r;1,q;1,3;1,4;1,-c;1,a;1,2p;1,1;1,1;1,-3;1,39;1,5b;1,5;1,1;1,-2;1,2l;1,1x;1,5o;1,-a;1,7;1,5;1,-1;z,-2;1,-3;1,-9;1,20;1,77;1,a;1,5;1,-7;1,1;1,-a;1,j;1,-c;1,5;1,6;1,4n;1,-3;1,50;1,-1;1,-5;1,2;1,-4;1,6;1,2s;1,2;1,1;1,90;1,a;1,-t;1,e;1,-1;1,-4;1,j;1,-q;1,n;1,-o;1,f;1,7;1,-6;1,-2;1,-9;1,5;1,9;1,-m;1,1;1,v;1,-6;1,66;1,91;1,f;1,6;1,-f;1,55h;1,-55c;1,-e;1,v;1,-9;1,7;1,-u;1,z;1,-s;1,b;1,-5;1,e;1,-a;1,7f;1,1m;1,-1;1,-1;1,3b;1,-2;1,1m;1,b3;1,9;1,8;1,-2;1,-5;1,2;1,-b;1,19;1,36;1,-1;1,2;1,mf;1,-3;1,f;1,o;1,-i;1,b;1,-l;1,o;1,-14;1,15;1,-a;1,4;1u,-13;1,5;1,d;1,o;1,-13;1,-2;1,-x;1,1j;1,8;1,-g;1,7;1,c;1,4;1,-s;1,x;1,-w;1,6;1,-3;1,-c;1,-3;1,y;1,-8;1,f;1,5l;1,9i;1,-k;1,3;1,o;1,-l;1,-4;1,d;1,-4;1,7;1,-e;1,r;1,-6;1,-1;1,a;1,-l;1,-8;1,l;1,6;1,-m;1,2;1,9;1,-7;1,5;1,x;1,-18;1,ar;1,-2;1,9;1,2;1,3;1,h;1,-r;1,b;1,2z;1,2;1,-1;1,1w;1,1;1,8b;z,-6;1,-2;1,-5;1,-c;1,6;1,n;1,-j;1,3;1,3;1,-e;1,6;1,-5;1,-2;1,m;1,-9;1,7;1,8l;1,x;1,2;1,-1;1,-2;1,12;1,-1;1,2t;1,3a;1,67;1,-1;1,6;1,-3;1,-4;1,-5;1,70;1,-3;1,91;1,-7;1,56;1,2q;1,8;1,-7;1,-2;1,6;1,2;1,-4;1,3;1,e9;1,-u;1,18;1,-23;1,-e;1,-f;1,1h;1,-10;1,4;1,q;1,-19;1,7;1,1;1,f;1,d;1,y;1,-1v;1,u;1,f;1,-y;1,-2;1,-3;1,-3;1,y;1,6;1,4;1,-q;1,-3;1,5;1,4;1,p;1,-1e;1,b;1,ha;1,-7;1,9;1,-6;1,2;1,-e;1,6v;1,2;1,-4;1,38;1,-1;1,-7;1,5;1,-4;1,3l;1,7;1,-5;1u,2;1,-1;1,1k;1,-1;1,t;1,28;1,3;1,6;1,-1;1,-4;1,-2;1,6a;1,6;1,1;1,-2;1,9;1,-1;1,-3;1,-2;1,4;1,-1;1,2w;1,b;1,-2;1,2p;1,-8;1,-6;1,3;1,2;1,-1;1,-2;1,5;1,2;1,1;1,-2;1,7;1,57;1,1s;1,-1;1,4;1,-5;1,24;1,2a;1,e;1,-a;1,-3;1,b;1,-5;1,4;1,-1;1,-u;1,s;1,-2;1,f;1,as;1,e;1,12;1,-1d;1,-8;1,1;1,2;1,7;1,-8;z,l;1,-3;1,1;1,-5;1,-7;1,9;1,-3;1,-5s8;1,5rs;1,9p;1,-1;1,4;1,z;1,o;1,i;1,x;1,4;1,11;1,-1;1,-1;1,1e;1,24;1,-fhr;1,-4;1,1;1,12i;1,4;1,-5;1,3;1,3;1,-4;1,k7;1,cs;1,8d;1,1;1,9i;1,4t;1,1;1,oa;1,7;1,e;1,1;1,3;1,-7;1,6;1,-5;1,-l;1,j;1,ly;1,5;1,-7;1,-5;1,9;1,2;1,-7;1,48;1,1z;1,73;1,1;1,-3;1,rx;1,-c;1,4;1,10;1,-r;1,-c;1,-4;1,1;1,g;1,-j;1,-7;1,4x;1,2z;1,1u;1,sc;1,5;1,1;1,-c;1,4;1,f;1,-6;1,-f;1,1;1,-5;1,17;1,-16;1,-5;1,j;1,dz;1,-2;1,-6;1,a;1,-6;1,ah;1u,8y;1,8;1,-b;1,c;1,-3;1,-8;1,5;1,7;1,2a;1,-1;1,95;1,8;1,-b;1,-9;1,3;1,4;1,3;1,24;1,n;1,1b;1,5y;1,-8;1,91;1,d;1,7;1,1;1,-b;1,7;1,2;1,-1;1,4c;1,-1;1,4z;1,cd;1,d;1,-g;1,7;1,-1;1,e;1,-g;1,9;1,2;1,-6;1,3;1,b;1,fg;1,-c;1,6;1,d;1,-b;1,a;1,-3;1,-e;1,f;1,-9;1,-4;1,9u;1,-2;1,1w;1,1;1,3h;1,9o;1,1;z,-2;1,3z;1,-1;1,nq;1,i;1,-6;1,3;1,-1;1,-f;1,2;1,8;1,a;1,-3;1,-5;1,c;1,3;1,-6;1,-3;1,-k;1,5;1,s;1,2a;1,-30;1,-1;1,7;1,4r;1,am;1,-1;1,-4;1,-7;1,g;1,-1;1,-5;1,-6;1,k;1,-f;1,-g;1,8;1,-9;1,q;1,-l;1,b;1,-1r;1,1f;1,2;1,14;1,-d;1,-c;1,-b;1,ae;1,-8;1,4;1,-3;1,-6;1,a;1,1;1,-8;1,dd;1,-3;1,-4;1,g;1,-3;1,5;1,i;1,-o;1,d;1,2;1,-d;1,-c;1,i;1,-h;1,g;1,-8;1,-a;1,n;1,2;1,-3;1,7c;1,1f;1,10;1,-1;1,-1;1,2v;1,6;1,-2;1,-2;1,9o;1,6;1,-2;1,-9;1,-1;1,8;1,7;1,2;1u,-c;1,-1;1,7;1,-4;1,c;1,-l;1,6q;1,1;1,1;1,3;1,d9;1,i;1,1;1,3;1,2y;1,-3;1,2;1,8;1,-5;1,ej;1,-15;1,6;1,11;1,-s;1,2;1,-k;1,u;1,-p;1,s;1,-c;1,8;1,-h;1,-d;1,h;1,6;1,-i;1,10;1,-w;1,x;1,-e;1,4;1,c;1,-h;1,2;1,fh;1,1;1,-2;1,6a;1,10;1,3;1,-ba0;1,ba5;1,-7;1,5;1,1y;1,-1;1,3;1,3r;1,2;1,-6;1,3;1,-7;1,6;z,-8;1,3;1,1e;1,2;1,-3;1,2;1,y;1,2e;1,1;1,1;1,2u;1,3t;1,-5;1,-2;1,5x;1,-4;1,-2;1,4;1,-9;1,d;1,-7;1,-5;1,2;1,-1;1,56;1,s;1,18;1,-4;1,1;1,10;1,c;1,l;1,2;1,-1;1,3g;1,-1;1,-3;1,-4;1,2;1,-c;1,3;1,r;1,-t;1,e;1,-b;1,4;1,bj;1,-9;1,-4;1,-5;1,h;1,-g;1,e;1,-3;1,-a;1,b;1,-5;1,2;1,b;1,-7;1,2;1,8k;1,-2;1,2b;1,y;1,-1;1,m;1,f;1,6;1,-1;1,-1;1,-1;1,10;1,9;1,-ffl;1,1;1,9t;1,2p;1,59;1,l3;1,2;1,-7;1,1;1,3;1,2;1,fi;1,3;1,-2;1,1j;1,ff;1,1;1,1;1,hw;1,4t;1u,9b;1,fw;1,lo;1,9;1,-3;1,-4;1,3;1,2;1,3a;1,2i;1,-1;1,75;1,sp;1,-7;1,-k;1,5;1,8;1,-e;1,k;1,-3;1,-c;1,r;1,-s;1,-2;1,h;1,3m;1,28;1,2k;1,st;1,e;1,-7;1,-a;1,l;1,-a;1,1;1,1;1,6;1,-i;1,d;1,-8;1,e;1,de;1,-2;1,-3;1,-5;1,3;1,4g;1,1;1,-2;1,-1;1,-2;1,fe;1,-6;1,-e;1,c;1,2b;1,96;1,a1;1,1;1,-6;1,19;1,8c;1,-2;z,6;1,-5;1,-5;1,7;1,42;1,53;1,1;1,cr;1,9;1,-3;1,-d;1,f;1,4x;1,-2;1,b0;1,-1;1,3;1,-8;1,7;1,-8;1,b;1,-8;1,2;1,-c;1,6b;1,-1;1,1l;1,3;1,1d;1,1y;1,1;1,3e;1,9r;1,-2;1,3z;1,-3;1,2;1,p4;1,6;1,-4;1,-k;1,8;1,7;1,-e;1,-3;1,l;1,6;1,6;1,-w;1,7;1,4;1,-7;1,-b;1,v;1,-a;1,9;1,-h;1,4;1,f2;1,-6;1,9;1,-d;1,1;1,i;1,3;1,-1;1,-5;1,-a;1,c;1,-9;1,b;1,-8;1,9s;1,-8;1,1;1,-4;1,a;1,-5;1,-4;1,5;1,-4;1,1b;1,1b;1,-1;1,1s;1,9m;1,-8;1,2;1,-a;1,j;1,3;1,-2;1,-9;1,a;1u,-4;1,-f;1,g;1,5;1,6k;1,1g;1,-1;1,10;1,30;1,1;1,2;1,4j;1,-2;1,3;1,-2;1,5e;1,b;1,-5;1,-9;1,5;1,c;1,1z;1,40;1,-1;1,-2;1,1;1,3;1,2p;1,b0;1,-1;1,35;1,-3;1,fl;1,-n;1,8;1,-d;1,o;1,-a;1,15;1,-d;1,-w;1,d;1,-1c;1,1p;1,-s;1,a;1,q;1,-b;1,-e;1,-h;1,a;1,-e;1,i;1,l;1,ba;1,2l;1,1;1,7a;1,20;1,2;1,1;1,-4;1,-2;z,3x;1,4;1,-1;1,13;1,1;1,1;1,3h;1,-3;1,4;1,-6;1,2w;1,-2;1,-2;1,3;1,3u;1,-1;1,-4;1,2r;1,1;1,37;1,-5;1,g;1,-8;1,7;1,-9;1,7;1,-2;1,7;1,-4;1,-5;1,-2;1,-8;1,4u;1,21;1,-1;1,4;1,-2;1,17;1,4z;1,1;1,-b;1,-2;1,6;1,2;1,-4;1,e;1,-s;1,3;1,l;1,-g;1,-3;1,c;1,-g;1,c;1,-7;1,bh;1,a;1,9;1,-6;1,4;1,-n;1,f;1,-8;1,e;1,5;1,1;1,-f;1,-i;1,9;1,1;1,-5;1,-7;1,s;1,-i;1,8;1,7;1,-j;1,a;1,6;1,8;1,-v;1,8c;1,-3;1,1b;1,1o;1,1d;1,j;1,1;1,c;1,9;1,1;1,1;1,-f1d;1,or;1u,3;1,-2;1,fk;1,gy;1,ht;1,1;1,87;1,1;1,5t;1,1;1,fs;1,m6;1,-1;1,-1;1,-2;1,5o;1,7d;1,-5;1,1;1,sv;1,-3;1,-6;1,-2;1,h;1,-8;1,-3;1,1;1,11p;1,-7;1,-6;1,8;1,-3;1,-3;1,h;1,-a;1,7;1,-5;1,-1;1,7;1,-5;1,-8;1,e;1,cy;1,1;1,44;1,5x;1,-1;1,8u;1,dt;1,-1;1,k;1,1b;1,67;1,2;1,1;1,-2;1,11;1,8j;1,-2;1,4;1,1;1,-4;1,5;z,3t;1,58;1,-2;1,1;1,3u;1,9e;1,-1;1,2;1,-3;1,-2;1,4p;1,b1;1,3;1,3;1,-1;1,8q;1,1x;1,3e;1,9u;1,-2;1,1e;1,2l;1,1;1,qh;1,-z;1,2;1,-3;1,t;1,-r;1,-a;1,e;1,5;1,-4;1,7;1,-f;1,f0;1,-9;1,1;1,6;1,-4;1,3;1,99;1,3;1,2b;1,1q;1,a1;1,a;1,-d;1,b;1,-5;1,2;1,2;1,6;1,g1;1,60;1,2;1,-4;1,5x;1,-3;1,1;1,-2;1,3;1,2;1,8j;1,52;1,-2;1,3a;1,-2;1,-3;1,1;1,go;1,8;1,-o;1,11;1,-h;1,5;1,-m;1,n;1,-5;1,o;1,-f;1,-c;1,-o;1,b;1,-9;1,g;1,7;1,8;1,-4;1,-o;1,f;1,-h;1,i;1,-b;1u,-3;1,g;1,-m;1,r;1,-b;1,d4;1,2;1,-1;1,9b;1,1;1,3u;1,2;1,1u;1,1;1,2q;1,2;1,1;1,-4;1,2q;1,1;1,3y;1,-2;1,b;1,-d;1,-1;1,8;1,67;1,2;1,-3;1,-5;1,-2;1,c;1,-d;1,5;1,a;1,-b;1,4a;1,3;1,-4;1,22;1,2;1,-1;1,6y;1,-3;1,-h;1,e;1,d;1,-q;1,20;1,-1l;1,7;1,-8;1,h;1,-3;1,-b;1,ba;1,-6;1,b;1,-7;1,-b;1,6;1,-8;1,b;z,5;1,-c;1,8;1,e;1,-j;1,a;1,-7;1,8;1,6;1,-a;1,5;1,s;1,-m;1,-j;1,g;1,1;1,6q;1,2;1,-1;1,23;1,-1;1,3;1,-1;1,22;1,-2;1,19;1,5;1,-2;1,-1;1,-4;1,1k;1,-fh3;1,-1;1,9r;1,-1;1,to;1,-6;1,1;1,wa;1,-1;1,hw;1,4;1,82;1,lo;1,m6;1,15z;1,-6;1,7;1,-b;1,8;1,11f;1,1;1,6;1,-2;1,1;1,-4;1,1;1,d3;1,-3;1,-1;1,9x;1,bd;1,9f;1,9y;1,9p;1,4;1,-2;1,md;1,-1;1,4f;1,bc;1,-3;1,1;1,3;1,-5;1,7;1,5c;1,32;1,39;1,bx;1,u3;1,i;1,-4;1,-7;1,4;1,-7;1,-3;1,e;1,7;1,-d;1,-1;1,9;1,-b;1,7;1u,ec;1,-c;1,-2;1,5;1,4;1,-8;1,f;1,v;1,83;1,-4;1,5;1,-3;1,3z;1,an;1,-1;1,-1f;1,1h;1,1;1,b9;1,4;1,4b;1,67;1,-2;1,5u;1,-3;1,2;1,dl;1,-2;1,1;1,38;1,hy;1,-4;1,-5;1,-d;1,k;1,-1;1,-c;1,9;1,-f;1,d;1,-b;1,k;1,-f;1,c4;1,-1;1,-1;1,9e;1,5;1,3p;1,y;1,3n;1,2t;1,-3;1,-6;1,48;1,-2;1,6b;1,4;1,9;1,-2;1,-2;1,-1;1,-7;z,5;1,3y;1,20;1,2;1,1;1,-2;1,10;1,o;1,61;1,-e;1,-1;1,g;1,-9;1,5;1,1;1,-5;1,-3;1,ba;1,-1;1,6;1,5;1,6;1,3;1,5;1,-h;1,7;1,-2;1,-8;1,-6;1,p;1,-l;1,1;1,-e;1,s;1,-n;1,-4;1,v;1,-p;1,q;1,-r;1,5k;1,y;1,27;1,3;1,-1;1,1a;1,-3;1,2;1,n;1,t;1,n;1,-1;1,1a;1,-fyx;1,1l9;1,-1;1,6;1,iu;1,d6;1,1;1,i1;1,-4;1,81;1,17z;1,-1;1,6;1,-4;1,161;1,-3;1,1;1,78;1,ug;1,1;1,1;1,-5;1,cs;1,1;1,3u;1,5y;1,9l;1,-3;1,4;1,-2;1,ba;1,1s;1,i0;1,3j;1,58;1,1;1,di;1,5;1,-3;1,2;1,-1;1u,4a;1,-3;1,bk;1,5a;1,1k;1,gn;1,3x;1,qx;1,1;1,-2;1,-7;1,6;1,4;1,dy;1,-4;1,-2;1,4;1,-5;1,98;1,26;1,-1;1,1p;1,ar;1,6;1,-2;1,4;1,-1;1,-6;1,ba;1,ao;1,-1;1,6;1,-8;1,-2;1,6;1,1;1,5l;1,2;1,dh;1,lh;1,4;1,-6;1,1;1,4;1,-8;1,-2;1,3;1,1;1,-3;1,l5;1,4k;1,3r;1,-1;1,2q;1,3t;1,7;1,6r;1,5;1,1;1,-8;1,3;1,-7;1,2;z,-1;1,9;1,-2;1,3k;1,21;1,i;1,g;1,r;1,-1;1,6p;1,2;1,-9;1,5;1,-b;1,-6;1,e;1,-5;1,-5;1,-3;1,-2;1,b;1,-7;1,bp;1,-9;1,c;1,-4;1,-f;1,5;1,c;1,-b;1,e;1,a;1,-g;1,-1;1,-2;1,v;1,-w;1,8;1,61;1,1m;1,1x;1,-2;1,-1;1,g;1,15;1,16;1,d;1,-fhh;1,9o;1,18v;1,-1;1,3v;1,d7;1,i3;1,8d3;1,-82o;1,j6;1,2;1,1;1,md;1,-4;1,35;1,9h;1,ti;1,1;1,-3;1,57;1,wh;1,-1;1,co;1,9s;1,-1;1,2;1,kt;1,9w;1,wj;1,-1;1,fj;1,rb;1,r2;1,6;1,-7;1,3;1,-b;1,a;1,3;1,du;1,2;1,-4;1,5;1,8z;1,-2;1,-1;1,3v;1u,b2;1,2;1,-3;1,-3;1,59;1,5w;1,an;1,5o;1,-1;1,gp;1,iu;1,-d;1,8;1,-6;1,7;1,o6;1,1;1,1n;1,gm;1,3;1,5h;1,1;1,1;1,8i;1,6;1,-8;1,-6;1,3;1,-2;1,a;1,4;1,-d;1,2;1,bx;1,-4;1,-8;1,-c;1,8;1,d;1,-k;1,i;1,-l;1,d;1,-8;1,c;1,-2;1,-e;1,a;1,8;1,-1;1,-b;1,5;1,5x;1,e;1,y;1,1;1,j;1,m;1,s;1,-1;1,-1;1,d;1,c;z,y;1,-1;1,-2;1,1;1,-ecc;1,-6;1,w1;1,7z;1,1q8;1,cg;1,1;1,th;1,11o;1,2;1,-4;1,3;1,cj;1,jc;1,a;1,kw;1,9v;1,3j;1,-1;1,j8;1,fh;1,6q;1,kk;1,ra;1,dx;1,-1;1,-2;1,m;1,nd;1,1;1,ll;1,1;1,1;1,-3;1,m9;1,-1;1,5;1,ix;1,-3;1,1;1,ho;1,2p;1,-3;1,4;1,3k;1,u;1,hl;1,3b;1,3o;1,7e;1,4;1,-1;1,-4;1,-4;1,2;1,bm;1,-4;1,9;1,-4;1,3;1,-1;1,-5;1,1;1,8;1,-a;1,-2;1,7;1,4c;1,3i;1,14;1,1a;1,1;1,1;1,-eci;1,2u2;1,3u;1,128;1,1;1,-2;1,3;1,11k;1,ck;1,3o;1,10u;1,1;1,9s;1,mo;1,2;1,3v;1,bo;1u,-2;1,3;1,-2;1,nb;1,1;1,v9;1,1;1,1;1,mp;1,1;1,2;1,-1;1,3o;1,bd;1,1;1,lo;1,-1;1,-1;1,157;1,-1;1,2;1,2;1,2;1,k6;1,89;1,6l;1,ll;1,6;1,-1;1,bi;1,2;1,3;1,-1;1,3;1,-1;1,40;1,2c;1,k;1,1q;1,1d;1,3;1,-1;1,-1;1,-eaj;1,4zs;1,2dl;1,2bx;1,12u;1,6s;1,m5;1,j5;1,4;1,-2;1,-1;1,163;1,es;1,-1;1,-2;1,4;1,bj;1,-1;1,6b;1,k;z,4a;1,-9bw;1,-3;1,2he;1,1v7;1,d0;1,-1;1,2;1,nz;1,72;1,el;1,w;1,1oi;1,88;1,1;1,2g;1,45;1,22;1,55;1,2;1,1;1,59;1,kx;1,2;1,8h;1,-c3l;1,1sn;1,1e1;1,3z9;1,1ng;1,15m;1,-2;1,1;1,160;1,-1;1,5i;1,kr;1,-8og;1,3z6;1,11w;1,1r8;1,1km;1,fy;1,-7ya;1,73q;1,en;1,bn;1,-910;1,1;1,94q;1,62;1,-1h;1,27",
	GB2312: "6jl,9hc;1,1;1,1;1,6x;1,-94i;1,-2;1,-f3;1,9cr;1,2;1,-35c;1,183t;1,-183s;1,g;1,-e;1,1;1,3;1,1;1,35j;1,1;1,-d;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,7;1,1;1,-7;1,1;1,-9cw;1,12;1,w;1,6kf;1,-f;1,1;1,-n;1,-2;1,r;1,-1;1,-x;1,1b;1,-t;1,3v;1,-3k;1,-5;1,6q;1,-3d;1,-32;1,3;1,1f;1,-l;1,-4;1,-b;1,-w;1,1v;1,e;1,1;1,-b;1,1;1,-1z;1,n;1,-1;1,su;1,-2;1,-7f4;1,682;1,1;1,5s;1,17up;1,-1e8w;1,1ef0;1,1;1,-186p;1,-689;1,6en;1,z4;1,-1;1,-1m;1,4;1,-1;1,-7;1,-1;1,-11;1,-1;1,j;1,-1;1,-12v;1,9j;1,-2;1,1;1,2;1,2v4;4z,-2a3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-13;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-13;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3,2pj;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3,-3bd;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4l,17rq;1,1;1,1;1,6a;1,-68;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3q;4j,-150i;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4u,e;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4r,-8yt;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;9,8;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;5l,1z;1,1;1,1;1,1;1,1;1,1;1,-k;1,l;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;g,1;1,1;1,1;1,1;1,1;1,1;1,s;1,-r;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4w,-ni;1,-w;1,6l;1,-6m;1,1f;1,-16;1,1e;1,-1f;1,1v;1,-1q;1,6b;1,-6c;1,2p;1,-2i;1,67;1,-68;1,3d;1,-35;1,62;1,-63;1,65;1,2;1,2;1,2;1,-68;1,-i;b,9i3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;57,-2eh;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1bm,9hb;1,ctx;1,-ccc;1,291;1,-2u2;1,1n;1,-21;1,6oh;1,-1x;1,2y8;1,-2mm;1,234;1,-1yp;1,-198;1,76v;1,6t;1,-8kl;1,-3a7;1,-2a7;1,3rj;1,pa;1,-1y7;1,75u;1,-4vm;1,4ti;1,-59o;1,3bg;1,-79x;1,3tp;1,2fq;1,2th;1,1oz;1,-b0y;1,1pv;1,1np;1,2qx;1,3qy;1,-675;1,-6y;1,-2ud;1,1m;1,7of;1,-87v;1,75l;1,-4og;1,yo;1,8hj;1,1wr;1,-agc;1,5u7;1,-81o;1,cm3;1,-4pi;1,-2lm;1,ud;1,-2we;1,2wf;1,-3lk;1,-446;1,c6t;1,-8cp;1,4l7;1,-41y;1,2u4;1,-341;1,-c9;1,69l;1,4et;1,-9oi;1,24p;1,-34q;1,2m;1,-3vc;1,7fz;1,-6mx;1,-4s;1,8q4;1,3j0;1,-9yw;1,21k;1,7q;1,4pw;1,-j3;1,-4cf;1,35f;1,2pz;1,2x1;1,-dl0;1,brr;1,-1ty;1,-e8;1,-921;1,aod;1,-ast;4j,a3j;1,3g5;1,-e1o;1,1ms;1,cwg;1,-c7o;1,1ec;1,-c;1,sv;1,7gl;1,36c;1,-8ef;1,-23b;1,3du;1,-4pr;1,-2n5;1,-1m;1,bxt;1,-2ws;1,2fl;1,1hg;1,-djo;1,6uz;1,-535;1,1k4;1,372;1,4nm;1,-9cn;1,87v;1,-5hf;1,3y4;1,-5xb;1,6oe;1,-1xm;1,-1mg;1,6lt;1,b6;1,1w;1,2yn;1,-a5j;1,7d1;1,-4cl;1,-5g8;1,4yz;1,2en;1,2v;1,-50o;1,4;1,-3;1,-2qd;1,3q;1,4mq;1,6b8;1,-9lc;1,-18z;1,57;1,9ga;1,-au6;1,83l;1,2wt;1,15o;1,9e;1,-1kk;1,-3ab;1,2s6;1,-8h7;1,-3nm;1,t5;1,-3e;1,bwq;1,1;1,2;1,4i;1,-7ye;1,-1p9;1,6r2;1,1cg;1,41a;1,-bpn;1,-31c;1,73z;1,-4hq;1,17k;1,212;1,-6i;1,-3sa;1,1oq;1,-3pv;1,1n;1,4d0;1,-52j;1,8mo;1,69f;1,-821;4j,102;1,-4lr;1,479;1,36t;1,-65v;1,-cl;1,9u5;1,-7v7;1,-51k;1,-47;1,3f0;1,9mb;1,-4z2;1,-8rp;1,2y4;1,74r;1,-80;1,38;1,-3ty;1,-9m;1,90p;1,-avy;1,-35l;1,bi;1,a5n;1,-9l1;1,-1xv;1,35i;1,2n6;1,3bu;1,42x;1,-9n6;1,y8;1,2t2;1,49x;1,-6lt;1,-zn;1,8gl;1,-4ae;1,4hp;1,pq;1,-9y6;1,777;1,91;1,3xr;1,-dou;1,a1f;1,-5ca;1,-23i;1,-5;1,32v;1,3m6;1,-4c;1,-a5a;1,5w4;1,4yw;1,-6iq;1,4r0;1,-3q4;1,-lg;1,5lc;1,-9f8;1,7up;1,-8mn;1,dh;1,5hb;1,-3d5;1,9wr;1,-8ez;1,-361;1,9cz;1,a;1,-5e9;1,3bj;1,-41j;1,-1ni;1,51;1,9m;1,92x;1,-84h;1,10u;1,77q;1,-7zu;1,-1y;1,70v;1,3lu;1,-2no;1,-2k7;1,4b6;1,-dvv;1,e3t;1,ic;1,-9zs;1,2kq;4j,-5i4;1,yr;1,ez;1,ax3;1,-dmo;1,9i9;1,-8wu;1,3j0;1,353;1,-6c4;1,-100;1,c4k;1,-8ht;1,9wa;1,-8zl;1,-3cb;1,4zg;1,-3gs;1,-1wt;1,5lp;1,638;1,-8vr;1,fp;1,-75;1,-tk;1,365;1,6lo;1,-2z5;1,2q5;1,-a6w;1,21c;1,-19z;1,2hk;1,88v;1,-1qf;1,-105;1,-72z;1,47z;1,-6qq;1,3nv;1,-1mx;1,-2q0;1,-168;1,8mr;1,-4yq;1,2vv;1,5li;1,-863;1,90f;1,225;1,-6g7;1,-7hd;1,6pd;1,-3qr;1,-354;1,4zr;1,70f;1,-9ms;1,bpx;1,-56d;1,66c;1,-fsn;1,2ia;1,9pm;1,-2ov;1,-55s;1,26w;1,-67s;1,31;1,aex;1,-86c;1,-9z;1,1el;1,97z;1,-5iw;1,4uw;1,-3xo;1,-4yn;1,588;1,-8tu;1,9ip;1,-1gz;1,-86s;1,a8s;1,-9g0;1,-z;1,4tz;1,-4i1;1,bmn;1,1a5;1,cr;1,-7wu;1,7tv;1,-8wa;4j,2xy;1,-7tk;1,7qn;1,-3wn;1,7h2;1,-9nm;1,25b;1,-16u;1,5nm;1,-3eq;1,-55p;1,a3d;1,-8td;1,-1gm;1,7ss;1,yx;1,-5kl;1,14;1,axx;1,-dec;1,f2;1,5ld;1,-2l0;1,9ta;1,-c6a;1,2w3;1,m2;1,7yg;1,-by8;1,4x8;1,3b0;1,1v7;1,-7hr;1,5od;1,-1tn;1,2nn;1,-21z;1,5xn;1,-1f2;1,-95i;1,3vz;1,4ie;1,-6eh;1,-4yy;1,bo6;1,-6r3;1,47d;1,sn;1,-8zk;1,-rv;1,-u0;1,-4z;1,qe;1,8g6;1,450;1,-490;1,-8qs;1,ce4;1,-3oe;1,-91;1,-4dx;1,-1g3;1,-2g8;1,9ju;1,-26d;1,1bs;1,-2x9;1,3jo;1,-4un;1,-2d5;1,4g;1,5oz;1,-3z1;1,-4b;1,-2x;1,-3j;1,9v2;1,-9nw;1,8lt;1,-416;1,-10r;1,-3x2;1,-1t8;1,-yp;1,4kz;1,-5au;1,3gx;1,-su;1,2n4;1,-5nn;1,cb8;1,-x8;1,-83q;1,9m1;4j,-9hq;1,6cd;1,-5tk;1,-424;1,10c;1,c6b;1,-8xs;1,5qm;1,-5b4;1,18o;1,-5pk;1,3hk;1,2k3;1,5x9;1,-8th;1,7te;1,-7so;1,r2;1,-3if;1,9vr;1,-5by;1,-4f7;1,3fn;1,8h1;1,-cae;1,2h5;1,5p8;1,-5tn;1,-1xo;1,7wr;1,-51b;1,9ef;1,-518;1,-4kg;1,-w;1,4j1;1,4q0;1,-5x9;1,170;1,y6;1,-pr;1,-7g7;1,cdc;1,-b5b;1,-1qu;1,692;1,6ie;1,-8f2;1,4b3;1,-1nb;1,-10g;1,3ln;1,-7b2;1,1jo;1,-tc;1,-1gl;1,8ya;1,-1ue;1,-5qn;1,76;1,9o3;1,-3cu;1,51o;1,-ahq;1,285;1,1xt;1,-1jz;1,-669;1,dsz;1,-ckw;1,5u2;1,-7hu;1,7hx;1,-4gx;1,gf;1,-1hi;1,40w;1,-e9;1,2iy;1,-77x;1,d7d;1,-dmy;1,1i;1,3go;1,-327;1,cqx;1,-1ow;1,cp;1,-5g3;1,19i;1,2xj;1,1o7;1,-rk;1,-b3h;4j,-15r;1,832;1,-6wx;1,crf;1,rx;1,1aw;1,-1y9;1,-bdf;1,9hk;1,-c5c;1,-6;1,pc;1,a0n;1,-6u9;1,-2ze;1,483;1,-4tw;1,3bo;1,-2wg;1,5er;1,-5he;1,3ei;1,ld;1,9my;1,-1zv;1,r5;1,-56n;1,5d1;1,-522;1,-2a9;1,1bs;1,2q;1,4y7;1,-a86;1,66c;1,4b7;1,-7hs;1,92c;1,-42u;1,-6pg;1,323;1,-427;1,6l9;1,-le;1,5se;1,-87a;1,-16w;1,50h;1,-7pk;1,-1bp;1,dla;1,-bhi;1,-nk;1,-w1;1,bii;1,-83w;1,a3d;1,-cyj;1,c6x;1,-5un;1,4zn;1,-8u2;1,-2wx;1,us;1,w;1,-bj;1,avr;1,-7st;1,7np;1,-2bp;1,-9h0;1,2wf;1,-1qz;1,99l;1,-8ba;1,cwt;1,-fi9;1,ee1;1,-2jo;1,-9sk;1,18x;1,-2k2;1,2yg;1,91v;1,4z;1,1od;1,-b9y;1,68z;1,-98t;1,99w;1,-74v;1,c4h;1,-8qs;1,-61x;4j,cdg;1,-bbz;1,8ll;1,-sr;1,-8qn;1,-5d;1,e5t;1,-84r;1,1dn;1,3kp;1,-7vn;1,4mc;1,235;1,-4c1;1,2r8;1,5n8;1,-4ep;1,-8rk;1,64l;1,-5qx;1,buv;1,-2j5;1,206;1,-58a;1,7ni;1,-8sy;1,-49d;1,8kp;1,-5q2;1,5bl;1,-60b;1,a9f;1,-byi;1,-23t;1,c00;1,-2kl;1,-518;1,62c;1,3u4;1,-d19;1,dbx;1,-4s9;1,-8zf;1,b83;1,-b19;1,8t6;1,-6qj;1,2s9;1,6f5;1,-231;1,2we;1,-c35;1,4qa;1,-55h;1,8tt;1,-7rs;1,52z;1,-ws;1,363;1,-6ym;1,-21a;1,3cy;1,85;1,5fq;1,-96i;1,2q9;1,2ay;1,66v;1,-8b6;1,b2z;1,qr;1,-6xr;1,-xe;1,65h;1,-cc3;1,8z2;1,2hs;1,-9ys;1,-1gl;1,-i1;1,y3;1,zp;1,2fg;1,5d9;1,-7cf;1,1dt;1,24;1,8um;1,-9qj;1,2qi;1,2yv;1,-8pj;1,5l;1,4l1;4j,19d;1,1o;1,2cl;1,2zm;1,-87u;1,4d0;1,-3o1;1,8vf;1,-ck6;1,d0t;1,-8qd;1,5fs;1,y;1,-6ut;1,6us;1,2ec;1,-bnp;1,avr;1,qt;1,-abi;1,-1oo;1,-bx;1,e2s;1,-73a;1,30j;1,2au;1,-9qr;1,9g7;1,23l;1,-bzx;1,7f7;1,-8ei;1,di;1,-2w;1,amv;1,-7n0;1,uh;1,8if;1,-5vn;1,-1n1;1,-36f;1,4h2;1,-2qa;1,3v;1,3se;1,13y;1,2jd;1,-8rb;1,4vb;1,-410;1,7wh;1,-btn;1,42;1,d54;1,-48a;1,9v;1,-dl;1,-6qj;1,3h4;1,-1cf;1,41l;1,-11q;1,765;1,-4zt;1,-e3;1,-jj;1,-4vr;1,9pu;1,-5ch;1,-7hx;1,4b;1,4fb;1,-1fv;1,-e1;1,bw5;1,-5sa;1,-28q;1,-6xz;1,dmf;1,-3ri;1,-5jz;1,620;1,2zh;1,43;1,-bs;1,-dz6;1,15m;1,8gl;1,-4gw;1,7fq;1,-2q2;1,-4yp;1,-1ne;1,6jj;4j,-7w7;1,7zx;1,-4o8;1,-242;1,1g6;1,-3oc;1,2q6;1,ch9;1,-fsv;1,cgh;1,-c3k;1,20v;1,o8;1,-8a;1,2ut;1,-1v1;1,8c0;1,-bsg;1,da0;1,-cyz;1,529;1,4e8;1,-360;1,-5dh;1,34y;1,7ft;1,-aa6;1,arh;1,-2c5;1,-9bm;1,7p4;1,-8rh;1,5u5;1,-3fd;1,-b7;1,doi;1,-eun;1,a1y;1,3xa;1,-2up;1,-2ae;1,-5ek;1,a49;1,-cxw;1,clp;1,-djt;1,6um;1,-6to;1,1w1;1,1ep;1,7i8;1,-bl8;1,41m;1,-iu;1,1qo;1,-4nb;1,205;1,-1yw;1,b36;1,-2sh;1,5wl;1,-56e;1,-601;1,319;1,5pf;1,-bty;1,2ly;1,9ss;1,-5gr;1,47o;1,-9zr;1,6jc;1,-4xf;1,cp9;1,-1wl;1,-1aq;1,2c4;1,-317;1,-489;1,-2t2;1,-2u;1,7im;1,-51;1,-bnc;1,c3x;1,-6gg;1,-171;1,8qg;1,-t4;1,-bg0;1,3a7;1,6l9;1,1ce;1,-bnj;4j,dtc;1,-ci7;1,3ke;1,-9d;1,-5tt;1,2ku;1,ces;1,-1t0;1,-9ff;1,9af;1,1fe;1,-ddq;1,51m;1,-3j7;1,-1xx;1,p9;1,897;1,4b;1,-5dg;1,-a7;1,is;1,-tv;1,-8h;1,399;1,-xf;1,-e;1,-3ru;1,2ta;1,5a5;1,-85x;1,-g7;1,an0;1,-6f3;1,7aq;1,-axs;1,7mi;1,-8ps;1,50y;1,-4xg;1,88;1,922;1,2g;1,-5g7;1,3gm;1,-7ci;1,-113;1,xf;1,6ve;1,4af;1,1vd;1,-85r;1,79;1,69f;1,-uz;1,47o;1,-3e2;1,-auz;1,ec2;1,-83g;1,-4el;1,3tk;1,-3nc;1,-298;1,-190;1,5fm;1,5yv;1,-7wv;1,9b2;1,-bl8;1,5jo;1,49t;1,4p2;1,-9p1;1,-3h7;1,p5;1,68a;1,-849;1,-15m;1,70l;1,-648;1,-4i;1,-ox;1,s5;1,32;1,-17y;1,3hr;1,40t;1,-5es;1,8l1;1,-p6;1,1ar;1,-42s;1,1yy;1,-2us;4j,-2zz;1,7qf;1,-9pe;1,2ns;1,-3yq;1,5y0;1,-22b;1,6ey;1,-922;1,-ax;1,6b4;1,-vh;1,19m;1,-6y1;1,78;1,b7r;1,-6q5;1,-212;1,3a;1,2r2;1,-4gv;1,3wz;1,1ot;1,-28s;1,7t1;1,-3b9;1,-5gx;1,-jj;1,-29r;1,6h2;1,4fs;1,-5e5;1,-oi;1,-3jx;1,k5;1,79z;1,-6py;1,c54;1,-7gq;1,2u5;1,-27k;1,-140;1,-787;1,2yu;1,386;1,-26h;1,-1kn;1,e9;1,8n5;1,-5ge;1,-2mj;1,8ro;1,-9fw;1,4l;1,7le;1,-9h2;1,44j;1,-27h;1,5v;1,-2se;1,2on;1,13a;1,7o9;1,-3sy;1,-8gz;1,6of;1,-wy;1,67g;1,1r;1,-2l6;1,wc;1,-5sl;1,-2b9;1,ctk;1,-92p;1,4m;1,5ze;1,-64m;1,-5ya;1,6ky;1,3t8;1,-6n5;1,-91;1,apo;1,-1ye;1,-3vz;1,-7st;1,11f;1,58;1,30g;1,2ta;1,xx;1,-26;1,bq;4j,zb;1,4wp;1,-1v0;1,-6d5;1,5id;1,3ng;1,-dh1;1,7b1;1,w;1,-8hs;1,3ug;1,9j;1,7nd;1,-3t0;1,589;1,-d8c;1,2fv;1,49l;1,-1u4;1,-4xr;1,1g6;1,732;1,-5fn;1,-3es;1,9be;1,-6xl;1,7ou;1,-6sf;1,-3cw;1,1yb;1,-2fp;1,8db;1,-7qj;1,2uu;1,2hi;1,-3gq;1,-2;1,9gf;1,f;1,-7gu;1,-17a;1,ard;1,-bzm;1,7dg;1,-1p;1,-80x;1,3hq;1,-2v2;1,-1xi;1,2f7;1,-1sm;1,9mi;1,46o;1,-28c;1,-4r0;1,68c;1,-div;1,8ad;1,-8jp;1,4vz;1,a14;1,-cl9;1,3az;1,28l;1,-67r;1,xo;1,65g;1,5a2;1,-78m;1,-6aa;1,9bh;1,cn;1,-83c;1,7f0;1,tf;1,-57r;1,-5w;1,3b9;1,-1m;1,-49g;1,3i;1,4rj;1,-8lv;1,hp;1,-4b;1,9s1;1,-511;1,80p;1,-vz;1,-5g;1,-og;1,299;1,-51d;1,-8tz;4j,a7;1,9u3;1,-9gf;1,e1q;1,-8kf;1,39;1,-66;1,-2wd;1,-2rp;1,1rb;1,fe;1,3eo;1,-6f;1,1t3;1,2yt;1,-5k3;1,-2z6;1,9y4;1,-b6a;1,cb5;1,yk;1,-3d0;1,-5kn;1,35b;1,-1jv;1,34g;1,-9xu;1,d2e;1,-70j;1,8xp;1,-cql;1,-nf;1,2mh;1,9nv;1,-5qd;1,-7ye;1,9rp;1,-2t5;1,4j5;1,33c;1,-56u;1,-2e;1,-8rj;1,3q2;1,8po;1,-dy;1,4;1,-brs;1,7mz;1,-4h5;1,-20;1,3q9;1,oi;1,2u7;1,2qn;1,-aa4;1,-327;1,9g7;1,-566;1,-6c;1,-s9;1,3xw;1,oy;1,-2r0;1,3iq;1,26o;1,-9hv;1,1mq;1,71z;1,-mc;1,-2mx;1,-7cd;1,-9g;1,7oa;1,4ee;1,-9ep;1,c4;1,5sd;1,-49z;1,8q5;1,-d8n;1,5zv;1,5kq;1,-2ew;1,4qn;1,-dwh;1,c4j;1,qb;1,1i0;1,-9pk;1,3sm;1,4eo;1,-63p;1,-ok;4j,-3ej;1,-1vv;1,9lg;1,-9us;1,9t8;1,-2b7;1,-3c5;1,apu;1,-ff0;1,3ku;1,5is;1,-b;1,f0;1,-9iy;1,c0h;1,-7av;1,9w9;1,-8f;1,-ceu;1,2jt;1,9gw;1,-amw;1,4ed;1,6ml;1,-5mf;1,-1;1,-84e;1,63z;1,1yh;1,-4ha;1,4gc;1,tm;1,-26i;1,76f;1,-ejs;1,6r7;1,-6qj;1,d85;1,-c6h;1,3hk;1,46;1,5jp;1,9;1,-8zb;1,1ib;1,50p;1,6py;1,-afc;1,35t;1,kk;1,-514;1,cac;1,-4hb;1,-7t6;1,-1j4;1,6zt;1,-88b;1,60g;1,3vw;1,-5u0;1,4c;1,-13a;1,-2gh;1,bxi;1,1t;1,1e9;1,-doe;1,s4;1,2ki;1,345;1,-5z9;1,3c9;1,bn7;1,-dgk;1,-1yx;1,7pt;1,-728;1,8kr;1,-57h;1,4m;1,-iq;1,7j;1,-3us;1,6qp;1,4no;1,-b2u;1,bgt;1,-2jn;1,-7ti;1,8sl;1,3bv;1,-d8s;1,hs;1,1r4;4j,-2lt;1,8ih;1,-2o9;1,70n;1,1wu;1,-dn3;1,-6i;1,-8l;1,9a;1,21d;1,yx;1,13i;1,-4nc;1,321;1,-31a;1,17k;1,-11u;1,vq;1,6gv;1,-76;1,-4t0;1,jk;1,5ex;1,-58l;1,1o;1,-3xx;1,6pf;1,31q;1,-5qk;1,2r1;1,7lo;1,-cmh;1,8kk;1,-5bg;1,7a;1,34w;1,69u;1,-62u;1,-6hq;1,-u8;1,-5g;1,56t;1,-5pl;1,6o;1,1uv;1,9jw;1,-28f;1,-8ks;1,gz;1,1ql;1,-1sy;1,-mc;1,7kd;1,-562;1,-zg;1,1n7;1,-7b;1,-2wt;1,2v4;1,-1b0;1,2co;1,-3pe;1,7g2;1,1mv;1,2vl;1,-a1w;1,8cx;1,-9f0;1,-ay;1,28w;1,8gq;1,-2k9;1,-87s;1,74w;1,-8ni;1,37m;1,-tq;1,329;1,-4rh;1,7xr;1,-1ou;1,-22k;1,33t;1,-5l;1,-3en;1,-402;1,-me;1,7yd;1,-55h;1,5wm;1,1xs;1,-8iv;1,d0z;1,-erl;4j,efc;1,-b4x;1,2n0;1,-4kf;1,2w2;1,-jk;1,-2fq;1,2d8;1,-3n;1,-pi;1,awx;1,-ccx;1,286;1,-2ma;1,9sq;1,-15j;1,2u1;1,-bi5;1,957;1,-5l8;1,7ht;1,-1o9;1,-8dv;1,2p1;1,-10p;1,4y0;1,55v;1,-dk1;1,5yk;1,5n8;1,-7xv;1,7gr;1,-7w6;1,5ro;1,-2tg;1,-d9;1,10g;1,-229;1,1uw;1,-3zm;1,9vo;1,-88n;1,18z;1,-1zg;1,-3aj;1,69b;1,2ov;1,-9lh;1,22h;1,ayt;1,-6fl;1,-n0;1,-5aj;1,-w2;1,ecn;1,-ay;1,-35b;1,-2ic;1,v9;1,-8pa;1,19t;1,2ls;1,5hl;1,-sw;1,-32p;1,-s9;1,31;1,-4o7;1,dd;1,45s;1,1y1;1,8r1;1,-6vx;1,-1rt;1,1c3;1,-23s;1,z7;1,-2ig;1,8e6;1,254;1,-6zs;1,219;1,-1h;1,-9c5;1,3yg;1,-53u;1,11o;1,-60;1,7f1;1,-794;1,-9p;1,-bl;1,-71;1,1x;4j,7iq;1,yx;1,cn;1,-359;1,8b5;1,-dgb;1,6p4;1,-68q;1,-zk;1,9kb;1,ny;1,2ek;1,13m;1,-asn;1,9f;1,2o3;1,-32f;1,1fn;1,5i5;1,3wm;1,-aer;1,38x;1,2rr;1,-et;1,-8h1;1,4hk;1,3zk;1,14u;1,-abv;1,cwy;1,g9;1,-8k1;1,-4pc;1,c47;1,-7rw;1,5gh;1,-9dc;1,799;1,-qx;1,-4bt;1,a8o;1,-6dz;1,-6hs;1,4cc;1,9nl;1,-arx;1,1c3;1,-3uq;1,asr;1,-4qi;1,-5yd;1,6ej;1,85;1,-2ho;1,3fk;1,5y7;1,-eea;1,d53;1,2eb;1,-9ar;1,-5io;1,bqe;1,-bac;1,2wh;1,3c4;1,37j;1,3r9;1,1ou;1,-24h;1,-dql;1,9k4;1,-91q;1,621;1,7i8;1,-bew;1,btl;1,-dk0;1,-zm;1,69k;1,12l;1,-21h;1,2wn;1,6jo;1,-75i;1,-6yp;1,74c;1,-1r7;1,-11q;1,-4g6;1,ffw;1,-66m;1,-8mq;1,7mr;1,-3h;4j,5hj;1,-cg2;1,28u;1,a5h;1,-8uj;1,-320;1,1z2;1,4pd;1,-2is;1,7r0;1,-3vp;1,-9c4;1,dnn;1,-bg5;1,3jt;1,-2ja;1,-37z;1,a23;1,4du;1,eq;1,-7if;1,61y;1,-1tv;1,-4t;1,3el;1,-9b5;1,206;1,-567;1,aup;1,-aag;1,b46;1,-dwf;1,cso;1,-doa;1,4de;1,-1uo;1,-4;1,6us;1,1fg;1,-55u;1,-2hw;1,3y4;1,-wz;1,36j;1,-6qh;1,185;1,-1ip;1,3uk;1,-5f5;1,-zo;1,46n;1,3id;1,-3pg;1,8ul;1,-cp4;1,-2d;1,5w5;1,3kg;1,2kk;1,-1i5;1,pp;1,-1nn;1,3c4;1,yw;1,-516;1,648;1,-3hl;1,-xn;1,-4ki;1,8yz;1,-5gq;1,-7dg;1,do3;1,-8io;1,va;1,2v5;1,3xm;1,m;1,-dif;1,-ec;1,qc;1,-1uj;1,fue;1,-evk;1,bxu;1,-2wv;1,-1vb;1,6ps;1,-3ok;1,-4r1;1,4du;1,-5xz;1,-13u;1,2q1;4j,5q6;1,-1w7;1,49;1,-2ex;1,-25b;1,-2ey;1,738;1,-39u;1,34q;1,3kl;1,-85b;1,2dc;1,5pn;1,-cwn;1,9eb;1,-9rk;1,2i3;1,95b;1,4s;1,-cfk;1,7dv;1,-2dt;1,6j;1,835;1,13n;1,-7fp;1,-xv;1,220;1,-5mf;1,blb;1,-86q;1,3wf;1,-50n;1,-21j;1,-ev;1,69;1,bpq;1,f;1,-e17;1,ahs;1,3x;1,-54d;1,2er;1,5zl;1,-6qd;1,-22d;1,-2mf;1,5hs;1,57v;1,153;1,-58l;1,3rv;1,-rf;1,-8vr;1,5se;1,-ij;1,359;1,-5q1;1,574;1,-8k6;1,ho;1,22v;1,2tz;1,1jp;1,-8yo;1,-20;1,ak;1,1gg;1,7a4;1,4t9;1,-423;1,-64o;1,3w5;1,2to;1,-2da;1,-2ag;1,-335;1,-zk;1,8l4;1,-42s;1,-v0;1,-1ua;1,3y8;1,-3g0;1,-ww;1,aj2;1,-9gv;1,6mp;1,4g4;1,-1ti;1,-ctc;1,34;1,azz;1,-7uc;4j,1;1,6mw;1,-5io;1,4mz;1,-1pw;1,-41r;1,auj;1,-b6j;1,vm;1,5mo;1,-8hv;1,dv4;1,-9wt;1,hh;1,-3sy;1,bji;1,-20x;1,-52k;1,-233;1,-zt;1,32y;1,-720;1,271;1,3k7;1,-3sq;1,2sb;1,-1nd;1,-29i;1,2uu;1,15f;1,346;1,3c;1,-zj;1,1jz;1,-4lj;1,-2s5;1,-4a;1,cpc;1,-sd;1,-arr;1,787;1,-3od;1,-5w3;1,27n;1,7mi;1,-7ns;1,-169;1,6ow;1,6mf;1,-cms;1,2fq;1,5wx;1,-6fp;1,akd;1,-7xf;1,-510;1,dnj;1,-e7w;1,1us;1,7is;1,-7rj;1,c4l;1,-e09;1,5ob;1,-3ah;1,1b7;1,-3un;1,rj;1,94s;1,2vf;1,-6ks;1,4fl;1,-6sj;1,-us;1,56y;1,-3yh;1,-8q;1,-p2;1,-15p;1,axz;1,2hs;1,-d0g;1,1e8;1,5pv;1,-79h;1,-173;1,cm4;1,3;1,-7uw;1,-2jh;1,1fc;1,266;1,-6ip;1,1wk;4j,1gm;1,1yv;1,131;1,-35a;1,9xd;1,-4c1;1,gm;1,-3wg;1,-5h3;1,2nc;1,-13k;1,-1ca;1,2nc;1,-1b3;1,2lf;1,69m;1,-3ap;1,-3n9;1,-90;1,5c9;1,2yz;1,-avo;1,4e9;1,a2m;1,-9yp;1,55t;1,-9s0;1,-rj;1,5ke;1,-4l6;1,b4a;1,-5fs;1,-3yv;1,e8;1,3z5;1,-3ft;1,5h;1,2wq;1,-3p0;1,2wb;1,-79;1,-1mm;1,21k;1,1hc;1,e0;1,-d0;1,-bs;1,-6y8;1,c7;1,-13c;1,37v;1,1er;1,57t;1,4s;1,-5yz;1,-2s5;1,-gu;1,612;1,4pr;1,11g;1,-6i8;1,-4tl;1,8rm;1,-82p;1,9ob;1,v4;1,1sm;1,-10d;1,-d0k;1,5rm;1,-4is;1,6j3;1,a2;1,-494;1,2tt;1,-a3;1,-36p;1,7en;1,-5jm;1,336;1,or;1,14h;1,-599;1,ax0;1,-bmw;1,47d;1,-6kh;1,6g3;1,65j;1,-af4;1,1e;1,-36r;1,6nh;1,-1ni;4j,-4fn;1,8nu;1,-2a4;1,70;1,-705;1,6ud;1,-7ab;1,286;1,9bf;1,-339;1,-8l4;1,6pk;1,7yo;1,-cf;1,-89i;1,15s;1,w6;1,-44h;1,3ry;1,-42x;1,al1;1,-292;1,-b56;1,8lz;1,-9vq;1,1so;1,8lr;1,7o;1,-7fe;1,-2h2;1,6x5;1,4i6;1,-9dh;1,-z2;1,49n;1,8ln;1,-cap;1,5wu;1,6xc;1,-28p;1,-3ti;1,-8cf;1,35n;1,a09;1,-dv8;1,af4;1,63;1,-3c;1,5l;1,-8v2;1,31c;1,-375;1,31n;1,1dk;1,62z;1,-7dg;1,1tg;1,-1rm;1,t7;1,-mc;1,-16k;1,-1nj;1,-2bc;1,qp;1,5s2;1,-1f8;1,xp;1,-5cp;1,4lx;1,-32c;1,3kw;1,1z3;1,-4t4;1,742;1,5z4;1,-bcp;1,3u9;1,-7;1,6kw;1,-2l6;1,-9o5;1,-2sk;1,4j;1,10u;1,10i;1,62j;1,-6n8;1,4a4;1,71s;1,-9mp;1,2nu;1,2u;1,62w;1,-7x7;4j,-m8;1,2j1;1,114;1,-367;1,9wo;1,1j;1,-cxu;1,by6;1,-403;1,-8tb;1,c3r;1,-c6g;1,fva;1,-203;1,2;1,-d46;1,5qn;1,6iv;1,-6xq;1,63z;1,-aar;1,117;1,2qc;1,15;1,-pr;1,-3tb;1,8vt;1,-co;1,-7oz;1,8ta;1,-7i5;1,o8;1,1id;1,8he;1,-9fr;1,-z2;1,1k1;1,30i;1,-85v;1,9g;1,2tb;1,be9;1,-a24;1,5d8;1,-6wb;1,-2la;1,8fy;1,-806;1,9od;1,-agg;1,3kr;1,578;1,55v;1,-dm9;1,-77;1,8j8;1,-14i;1,-6kw;1,9g5;1,-5wn;1,44r;1,-5wg;1,3ac;1,8gh;1,-1jr;1,-6zd;1,-5ic;1,n5;1,58m;1,-1tj;1,bq;1,14s;1,-297;1,b02;1,-2gw;1,-8z5;1,4ae;1,18b;1,-4s;1,-8mr;1,d5l;1,-5ny;1,-1j5;1,-488;1,bjl;1,-77q;1,6h2;1,-bip;1,a6k;1,-6ac;1,7ul;1,-9yf;1,ca1;1,-8r5;4j,-56y;1,19c;1,dp1;1,-3jc;1,-bfs;1,nh;1,cyn;1,-9r8;1,8d4;1,-79u;1,-5ep;1,76q;1,-3pz;1,33t;1,-6es;1,2t;1,8t9;1,-2w6;1,144;1,-6v8;1,es6;1,-adv;1,2wn;1,5zm;1,-2qv;1,-1th;1,-2um;1,3x;1,-6d6;1,4ei;1,2kx;1,-5j4;1,2es;1,-2u9;1,agi;1,2q5;1,-ava;1,5lx;1,-5wc;1,35g;1,-4qp;1,-20b;1,-7;1,3df;1,b2y;1,-eek;1,bzd;1,-bdt;1,1hj;1,7c1;1,-5lj;1,-3uv;1,4k8;1,-rb;1,6ju;1,b5;1,-9y;1,tm;1,-4c9;1,-ke;1,-3r1;1,6xl;1,-8xn;1,3le;1,sr;1,4vp;1,j4;1,yk;1,-av7;1,220;1,-e0;1,apb;1,-cvy;1,5wq;1,-5bs;1,b0g;1,18q;1,1bz;1,-3c4;1,-3cc;1,6gi;1,68;1,-7yi;1,473;1,-71w;1,129;1,1og;1,4k6;1,-je;1,5ed;1,-did;1,agt;1,-cia;1,14o;4j,-wz;1,4ed;1,ku;1,-3ni;1,-1ik;1,4bx;1,arq;1,-b3j;1,-1ih;1,525;1,2s3;1,-43t;1,-xn;1,-4qv;1,a07;1,-2a4;1,-3b6;1,-45j;1,57k;1,3ko;1,-92u;1,x6;1,5ix;1,1z1;1,-45l;1,2ns;1,2zl;1,-5gi;1,-254;1,-21d;1,671;1,4j2;1,2nz;1,2z;1,-9sg;1,80s;1,-2b2;1,-8q7;1,4i9;1,-1zi;1,5pj;1,-7mk;1,-1v2;1,17m;1,b2h;1,-7pf;1,-4si;1,2s0;1,8ux;1,-6dt;1,-11w;1,4hr;1,-1t2;1,3hi;1,-9eb;1,dmk;1,-btx;1,-1ex;1,bt9;1,-3jc;1,-7e3;1,a94;1,-1ab;1,-xn;1,1;1,28p;1,-84i;1,-1mo;1,11p;1,2ew;1,2b9;1,3nk;1,-3uv;1,-lg;1,-6go;1,-11f;1,cj7;1,-6gq;1,-3wx;1,78l;1,-12f;1,-2ja;1,-3c7;1,-8b;1,59g;1,2as;1,-67k;1,2ix;1,-46f;1,5kf;1,6;1,-j7;1,-65n;1,8mk;4j,-1ki;1,-12;1,-776;1,96b;1,-88p;1,1d1;1,-yf;1,531;1,-2lt;1,1qa;1,5so;1,-9en;1,8c9;1,-a40;1,78y;1,-451;1,l4;1,-4l2;1,en3;1,-3mn;1,-8gy;1,9ig;1,-b10;1,73k;1,-7z7;1,2j3;1,ca0;1,-crv;1,11g;1,563;1,-6dr;1,-251;1,549;1,-510;1,40y;1,7ty;1,13e;1,-c4e;1,3u8;1,-383;1,40;1,bdi;1,-cvh;1,54;1,d31;1,1ie;1,-8yp;1,-2rx;1,g1;1,-wv;1,942;1,en;1,-7mn;1,-kr;1,ax7;1,-c9a;1,3b;1,1hl;1,-2u2;1,-9j;1,6rz;1,-78p;1,a7j;1,-5u2;1,7l;1,k7;1,-1rs;1,8w1;1,-bsv;1,94u;1,-401;1,1j2;1,-7qh;1,cfc;1,-9um;1,4dr;1,3yo;1,-65a;1,20;1,4ux;1,1hq;1,4p9;1,2b;1,-d6q;1,24x;1,81t;1,-7vj;1,-4y;1,-11u;1,4w9;1,-6s1;1,181;1,1bu;1,1xd;4j,-2xo;1,-2se;1,91y;1,-5h5;1,74s;1,-3t3;1,-4kk;1,1zi;1,-10f;1,aaw;1,-dao;1,60h;1,538;1,-6a5;1,27h;1,j1;1,-7hc;1,70e;1,6ha;1,-4f2;1,1y0;1,-3vj;1,-3ep;1,1wt;1,-26q;1,-7u;1,-2u7;1,1yf;1,52c;1,-7gp;1,-15n;1,5su;1,45n;1,-77w;1,-17b;1,6w;1,-1i9;1,2;1,enq;1,-br3;1,1vv;1,4vu;1,-6d2;1,b5s;1,-1oh;1,-ad2;1,9ip;1,1l;1,-7vd;1,5z0;1,-5tm;1,-2xt;1,8uq;1,2vq;1,-cy6;1,8y1;1,3r3;1,-3uo;1,-8mk;1,1ge;1,4f2;1,-3qo;1,9hm;1,-286;1,3cl;1,-2jg;1,-1s5;1,25i;1,366;1,4;1,-4oa;1,5im;1,-6rp;1,-5jh;1,5w6;1,4bv;1,19h;1,-5s8;1,-5xi;1,1l2;1,4oc;1,1xi;1,-5k4;1,-3vr;1,8bn;1,-26x;1,1si;1,4pr;1,-a0x;1,-1ys;1,-1va;1,2i5;1,-ei;1,-85;4j,5cp;1,-37z;1,8j1;1,-1o;1,-2m9;1,ee;1,-6co;1,-2ws;1,4xs;1,772;1,-b3o;1,1cn;1,2gf;1,-46b;1,2kd;1,82o;1,-4jj;1,-1fm;1,-4ni;1,3s5;1,29c;1,-1ab;1,5og;1,-11;1,-aea;1,421;1,5nn;1,-34v;1,-45t;1,-33d;1,5o4;1,-uh;1,-3yk;1,2c2;1,-2eg;1,3by;1,4vv;1,-8sr;1,7uu;1,-8u6;1,cde;1,-6i6;1,6ab;1,-5o4;1,-2n0;1,1zg;1,8p;1,36a;1,10e;1,-5hd;1,7uo;1,-6qz;1,80u;1,-24u;1,-9xt;1,4yq;1,3u3;1,-va;1,-2bm;1,43y;1,-6or;1,-4ez;1,bta;1,1db;1,-9q9;1,afc;1,-21g;1,-b7s;1,-17t;1,4oc;1,-38w;1,212;1,2io;1,-5ea;1,1za;1,-m8;1,442;1,-49c;1,5ol;1,-k;1,-434;1,6nc;1,-5q;1,-5yt;1,uo;1,801;1,-4vc;1,4hl;1,-5b;1,1hp;1,-asr;1,-235;1,4n;1,5nb;4j,-w3;1,-2mh;1,-2vv;1,-bz;1,35s;1,wd;1,64t;1,2qb;1,-7uy;1,84e;1,-52z;1,-71j;1,csw;1,-ak8;1,5fl;1,-3n3;1,-10x;1,4r1;1,p9;1,-1s4;1,-7dw;1,3ku;1,-1up;1,au3;1,-c9j;1,7uz;1,5a;1,-70j;1,1p0;1,9ky;1,-6tu;1,-3du;1,-11d;1,-lr;1,-jg;1,5q1;1,-4mj;1,2iu;1,agb;1,-4k4;1,13q;1,et;1,1cm;1,-btu;1,1n5;1,7dd;1,-63u;1,-3i;1,63d;1,5qc;1,-1kl;1,tq;1,e;1,-9qn;1,-32g;1,1ta;1,-2ol;1,2qg;1,-2tr;1,9w2;1,-525;1,-3sp;1,5b7;1,3w6;1,-5rm;1,-3mc;1,a46;1,-8wt;1,30v;1,10r;1,79w;1,-eo5;1,6v3;1,-48b;1,5qj;1,-47u;1,m5;1,37g;1,-4az;1,-10w;1,-9e;1,-2f6;1,a4u;1,-44r;1,1ep;1,-7ai;1,4x4;1,4p4;1,-6a9;1,1a2;1,81;1,-1fn;1,-190;1,3h;4j,r0;1,dd;1,-2f1;1,dit;1,-1l5;1,-7tk;1,-3f5;1,-cl;1,2b4;1,-3ol;1,6j7;1,33b;1,r7;1,93;1,-8ca;1,-245;1,b;1,2l0;1,6su;1,-4n6;1,5ww;1,-9lz;1,6ho;1,29g;1,-8jl;1,dsd;1,-f0i;1,63k;1,5wm;1,-9hm;1,12f;1,-2rp;1,6us;1,-1km;1,4td;1,-6ir;1,9kk;1,-4le;1,-8e6;1,7i0;1,k7;1,4x0;1,-cnh;1,89s;1,-24z;1,-3ip;1,73u;1,-512;1,2kc;1,-4uk;1,pc;1,-3lm;1,396;1,1pe;1,-2vs;1,-1vz;1,cp8;1,-dwc;1,5xx;1,68b;1,-9ep;1,1w5;1,5oc;1,-54l;1,-415;1,-a;1,4nr;1,-2t;1,-5oy;1,432;1,-35m;1,992;1,-a35;1,4h;1,1io;1,23w;1,agk;1,-9lm;1,2dh;1,-67e;1,-2m;1,2ri;1,8k0;1,-7h7;1,29x;1,-1zd;1,6pb;1,-3e5;1,-2d;1,-3gt;1,-379;1,-eb;1,ctl;1,-6uf;4j,1hi;1,-51t;1,-gz;1,hp;1,6j8;1,-808;1,1jb;1,3ag;1,-45;1,-g5;1,-gq;1,180;1,-1ks;1,5yh;1,-8e8;1,-34d;1,2fn;1,-107;1,chz;1,-7v0;1,350;1,526;1,-adm;1,5o7;1,-1fc;1,2y8;1,-a57;1,dff;1,-1hk;1,-83z;1,-1wm;1,-2m9;1,6z1;1,-7aa;1,13v;1,12h;1,-zg;1,31p;1,9t4;1,-deo;1,-hb;1,fcz;1,-5x4;1,-8a4;1,b58;1,-y8;1,-17h;1,3wb;1,-7z8;1,-2ug;1,-uy;1,29e;1,9ij;1,-6ux;1,-3m;1,-67j;1,917;1,4qz;1,-544;1,-73r;1,bm5;1,-13;1,-4nl;1,-1jb;1,-6za;1,d04;1,tf;1,-5wo;1,2oj;1,-5bg;1,-6bb;1,9rn;1,-19r;1,3nl;1,-8hf;1,-2ee;1,-17m;1,eku;1,-bk2;1,2ga;1,-51u;1,n6;1,b4g;1,-1mi;1,-2bu;1,61z;1,-dkq;1,is;1,c5;1,cbh;1,-7so;1,-3ir;1,3kh;1,-1gz;4j,-210;1,-4y;1,2is;1,4tx;1,-8im;1,7fd;1,-4ax;1,ss;1,-5a1;1,5nw;1,5jb;1,37h;1,-dh8;1,34g;1,7v;1,8s0;1,-8i6;1,5d1;1,28f;1,-bjr;1,4k7;1,-46w;1,add;1,-7jl;1,264;1,1j;1,65j;1,-9g1;1,861;1,-l7;1,3ml;1,-8a1;1,77c;1,-8a3;1,-14l;1,-1k;1,-34y;1,b50;1,-6qu;1,5dy;1,-2t8;1,-3lb;1,-32e;1,4d;1,12y;1,1jr;1,9q8;1,-1na;1,1ty;1,-a3e;1,1qv;1,-1ew;1,-190;1,-1ov;1,4y;1,9aa;1,-92o;1,50x;1,8cr;1,-7cq;1,-6t5;1,65;1,9f4;1,-4td;1,-3g8;1,chv;1,-5e0;1,2xi;1,-1wz;1,-7k4;1,1v1;1,agk;1,-3ae;1,-9j6;1,d43;1,-b8r;1,8q0;1,-1dg;1,2hf;1,-c5a;1,3kk;1,-1ge;1,4i5;1,-454;1,5qi;1,-6wf;1,76z;1,3;1,398;1,-beq;1,16k;1,zt;1,10f;1,2pl;4j,5mt;1,-52e;1,5i;1,1ip;1,4uy;1,-3ix;1,-8c5;1,64u;1,5me;1,-2wa;1,-ak5;1,62s;1,-3j9;1,18i;1,7hy;1,-9gn;1,cc4;1,-bym;1,2p4;1,5u;1,66q;1,2;1,uz;1,-1x;1,-bwa;1,301;1,bqi;1,7;1,-elp;1,-179;1,adu;1,-38k;1,403;1,-87a;1,8jn;1,-59m;1,846;1,-d10;1,-187;1,c2k;1,-59p;1,-5l8;1,cwc;1,-7ca;1,-km;1,1qv;1,-817;1,8a7;1,2ym;1,-8dl;1,gd;1,8i2;1,2vw;1,-i6;1,-7eo;1,-r3;1,-3uj;1,21x;1,3v7;1,3dd;1,-4zd;1,3tr;1,-8cj;1,52d;1,-5zd;1,77y;1,61z;1,-czk;1,21x;1,3ii;1,-48s;1,9k6;1,2uq;1,-9ah;1,-3md;1,dmp;1,-760;1,-3nj;1,-zg;1,-3r1;1,7jm;1,1yh;1,-3nj;1,84o;1,-8b0;1,-5rr;1,7oi;1,-76f;1,4ho;1,1dz;1,6ki;1,-2z4;1,-7ve;1,5b4;4j,-373;1,-1ls;1,abi;1,-4b8;1,3gy;1,-9xl;1,-10u;1,8yc;1,a7;1,176;1,-1vl;1,-4i8;1,-3qa;1,8a0;1,-2rj;1,68n;1,-cns;1,-nr;1,emu;1,-afz;1,-48s;1,15o;1,3r1;1,57c;1,-7xr;1,42e;1,-69e;1,261;1,-14u;1,3a3;1,9p7;1,-dp0;1,-43;1,bbt;1,371;1,-cih;1,aw0;1,-4f0;1,-8i9;1,9vq;1,-28v;1,-1sf;1,-3c6;1,-c4;1,12t;1,1wo;1,5to;1,-aqv;1,2qg;1,-32x;1,87e;1,-83i;1,a6t;1,-6ax;1,oy;1,8e6;1,-aag;1,-2pm;1,3ay;1,6rx;1,2uq;1,-33o;1,-255;1,-7ph;1,bhq;1,-7ut;1,246;1,-2db;1,-3gd;1,801;1,-1m0;1,5s1;1,-1h;1,2k;1,-1l;1,-8un;1,6ii;1,-1c;1,-72;1,vb;1,1i;1,-8sr;1,447;1,8qk;1,-cf;1,-bw9;1,-15o;1,ct3;1,-7pn;1,-3l2;1,c6h;1,-c39;1,kc;1,ayj;4j,-d9c;1,9dt;1,-4w0;1,-33x;1,dfg;1,-cm4;1,6fo;1,wh;1,2z;1,1;1,-5a;1,rk;1,1on;1,-h8;1,-4gq;1,-4lz;1,bad;1,-6cq;1,-3m4;1,-3ep;1,2rq;1,-3uq;1,9y8;1,-2d7;1,-4k0;1,b2t;1,-1qb;1,-1e9;1,-9yi;1,4tg;1,49;1,-9g;1,-2bd;1,-2pk;1,6sh;1,-4h7;1,-31h;1,3go;1,-55;1,-qr;1,4y5;1,5fh;1,sy;1,-6pz;1,-16o;1,an;1,6xd;1,-8cg;1,-3su;1,14;1,-wy;1,d4o;1,-15k;1,-b3d;1,244;1,9qe;1,-6ou;1,-66u;1,7xw;1,-2m4;1,5p4;1,-7d0;1,6i4;1,-a0d;1,3p;1,cps;1,2f2;1,-bqr;1,2l0;1,-9;1,7zl;1,-e7x;1,2ax;1,bzr;1,-ee2;1,2up;1,5ru;1,-5yq;1,9k6;1,-2eo;1,-2es;1,-5gq;1,8fg;1,2t2;1,-c00;1,bwm;1,-bkc;1,1f3;1,jb;1,9z;1,20a;1,1j3;1,2pt;1,1xz;4j,-5qt;1,-3hd;1,8w2;1,33j;1,-2e1;1,2rm;1,qu;1,-9ih;1,-5ly;1,-2p;1,19c;1,9ni;1,-ag2;1,385;1,8m9;1,-b6w;1,-id;1,j2;1,5kp;1,-xb;1,39k;1,3b8;1,-2kr;1,-6mq;1,-7r;1,apm;1,-9de;1,4om;1,2xw;1,1l;1,1cy;1,-b1u;1,6b5;1,-49o;1,-19e;1,ajj;1,-4bx;1,-9s7;1,d3q;1,-c87;1,dbc;1,-dnr;1,ccv;1,-21o;1,2cp;1,-8i0;1,9sw;1,-bz4;1,-1mg;1,7bv;1,-3cm;1,6z;1,-3uc;1,5h1;1,-43y;1,a8d;1,-c8g;1,13v;1,-hj;1,38h;1,a8;1,7oc;1,-r;1,-2es;1,nx;1,2dd;1,-3v2;1,-8gw;1,a9o;1,-5zs;1,-ca;1,1x4;1,4jn;1,1jx;1,-b2v;1,bee;1,-526;1,-170;1,a7;1,5dq;1,-8ca;1,-3bk;1,5b8;1,6db;1,-8xa;1,-1gw;1,1rk;1,12o;1,7ky;1,-8ia;1,-2hn;1,4ts;1,-1di;1,7y2;4j,12y;1,7r;1,-634;1,-2zn;1,bn;1,-465;1,-18e;1,6sr;1,5cg;1,-7sg;1,8j;1,-1za;1,64f;1,-8cq;1,2b2;1,5hv;1,-2ca;1,61k;1,-2qp;1,-34q;1,1zl;1,-3dy;1,8a6;1,-9yi;1,-60;1,89v;1,-5yo;1,-42w;1,2wo;1,4w1;1,-2gu;1,3aa;1,-44e;1,3b5;1,-5f4;1,343;1,-36b;1,vg;1,1zw;1,-18y;1,-4zy;1,360;1,9au;1,-cb3;1,9ux;1,-230;1,6eg;1,-a81;1,nm;1,-q7;1,20u;1,6gp;1,-5ji;1,2rm;1,-943;1,9c1;1,-8t7;1,bya;1,-91y;1,-2p2;1,9vi;1,1pl;1,-32s;1,45u;1,-35s;1,24i;1,-6tc;1,19w;1,-2su;1,3gg;1,-ez;1,mb;1,1xw;1,277;1,1gq;1,-dlu;1,4q7;1,2sk;1,4cx;1,27x;1,-a8o;1,9w8;1,6m;1,-3gd;1,-6mt;1,3z2;1,-4ow;1,3u7;1,-76v;1,3gr;1,128;1,-hx;1,1o4;1,-17o;4j,-1eg;1,4o0;1,5ca;1,-100;1,-1t0;1,-5c0;1,-ha;1,-3cu;1,a1z;1,-303;1,1q5;1,2o;1,-43l;1,-5x2;1,9ks;1,at;1,-1ug;1,-2qv;1,i1;1,-1tb;1,-3l7;1,-54;1,1j0;1,2br;1,1nf;1,6sc;1,-bf8;1,3jy;1,4wg;1,-63l;1,n7;1,4d;1,5z0;1,1;1,-hy;1,-6ky;1,-8z;1,-23n;1,404;1,3u7;1,1d;1,3ri;1,-5n3;1,117;1,-1di;1,-f7;1,2qf;1,-8rp;1,80o;1,-4it;1,af3;1,-2eg;1,-1wv;1,-zf;1,1de;1,3da;1,-d7f;1,11;1,a2w;1,-913;1,1va;1,310;1,61m;1,-2zr;1,3pr;1,-2xo;1,-6ta;1,-1vs;1,6qn;1,-5co;1,23n;1,aco;1,-7no;1,-2ba;1,629;1,-696;1,2d5;1,4we;1,-t;1,tx;1,-45z;1,-1zy;1,43;1,-2wa;1,44l;1,-6m0;1,-1km;1,aos;1,-5ly;1,-47c;1,aaf;1,19q;1,1je;1,-52f;4j,-8oy;1,5uh;1,2gl;1,6ji;1,-b1k;1,32v;1,-2zx;1,-44q;1,8ar;1,4ly;1,-8fw;1,816;1,-3h0;1,-3tp;1,-1yd;1,8ch;1,-9bz;1,26w;1,-2b4;1,53c;1,-1wo;1,8pj;1,-10o;1,-it;1,-ans;1,7ts;1,2km;1,-bi8;1,3gj;1,-34;1,-32e;1,455;1,2c6;1,2xr;1,2tn;1,-buw;1,6po;1,-1c4;1,-mq;1,-5ht;1,mn;1,b6k;1,-a4l;1,43w;1,-7b;1,-3mw;1,6of;1,-95j;1,90p;1,-2p6;1,-3ur;1,7mi;1,-3x9;1,-3p2;1,cks;1,-9wu;1,7dh;1,-9zn;1,6zp;1,-62p;1,60q;1,3k4;1,-nd;1,-aap;1,22m;1,4cy;1,3x0;1,-bj5;1,3nh;1,3uv;1,3n3;1,22e;1,-4mv;1,4c7;1,-4e1;1,-7ym;1,bpx;1,-8eh;1,4tm;1,-6zk;1,acr;1,-8ct;1,-1mq;1,-2vq;1,4um;1,-4n8;1,-72;1,1kk;1,1g7;4o,-36i;1,-3l;1,ms;1,-mo;1,3cf;1,-2be;1,-10w;1,3n;1,-3e;1,f84;1,-cli;1,-zn;1,-1mp;1,8lu;1,-8l7;1,ye;1,-y6;1,25i;1,4y6;1,-631;1,4v6;1,-46p;1,8at;1,4vn;1,-91g;1,2az;1,7tl;1,-fz5;1,2x;1,fw1;1,-fxw;1,d;1,16;1,a9h;1,-7ql;1,-167;1,4j;1,-1fv;1,y1;1,g;1,6;1,2;1,9;1,ddj;1,-1zc;1,-bib;1,63;1,-5r;1,8;1,g;1,bha;1,-bg6;1,-3;1,-9t;1,6;1,6;1,v;1,6;1,c;1,1;1,c;1,i;1,3;1,-5;1,9xv;1,-9wy;1,5;1,-1;1,f;1,3;1,-7l;1,91u;1,-9ll;1,8;1,6;1,-7;1,12;1,-7;1,a;1,-d;1,1p;1,-14;1,1b;1,1u;1,-33;1,1c;1,2;1,-u;1,y;1,1f;1,9;1,4b5;1,-4bi;1,3;4j,2;1,-8;1,-11;1,b;1,1l;1,-2;1,t;1,-8;1,-6;1,c;1,-h;1,-3;1,1b;1,-1a;1,1c;1,-o;1,2a;1,2;1,2;1,-11;1,l;1,9;1,-7;1,-b;1,e;1,p;1,1d;1,z;1,-2h;1,1l;1,-t;1,v;1,-1;1,-1b;1,u;1,-g;1,p;1,3;1,2e;1,-1n;1,i;1,-d;1,6;1,u;1,f;1,16;1,2;1,2;1,h;1,s;1,1c;1,-p;1,-1;1,-6;1,8;1,p;1,4;1,-fi;1,5sw;1,-5ph;1,d;1,2x;1,frm;1,-a56;1,372;1,-8hy;1,2hb;1,css;1,-10x;1,-e8n;1,1hv;1,-17f;1,k;1,auy;1,-auv;1,-85;1,1f2;1,-1j8;1,-j9;1,ja;1,-ir;1,bej;1,1i;1,-bfz;1,9y7;1,1j2;1,-30y;1,-5zg;1,8un;1,-1mz;1,-93h;1,6;1,c;1,-1;4j,b;1,-1d;1,c;1,3;1,bgb;1,6;1,1;1,3;1,a;1,1;1,2;1,b;1,1;1,8;1,4;1,-1;1,4;1,1;1,1;1,2;1,2;1,1;1,3;1,3;1,1;1,4;1,4;1,1;1,5;1,2;1,3;1,3;1,3;1,3;1,3;1,1;1,2;1,2;1,3;1,5;1,3;1,2;1,1;1,2;1,1;1,1;1,3;1,2;1,-3;1,5;1,2;1,1;1,1;1,4;1,2;1,3;1,1;1,3;1,1;1,3;1,1;1,2;1,1;1,-b7x;1,h;1,d5v;1,5;1,-1;1,g;1,-7;1,j;1,-1;1,6;1,7;1,b;1,b;1,8;1,5;1,6;1,2;1,k;1,5;1,a;1,p;1,-17d;1,4;1,2;1,-4;1,j;1,-b;1,j;1,-1;1,3;1,4;4j,-2;1,-8;1,v;1,-a;1,-7;1,i;1,-c;1,3;1,c;1,j;1,-4;1,-6;1,-5;1,4;1,g;1,4;1,f;1,6;1,u;1,-4;1,5;1,e;1,-2;1,a;1,a;1,3;1,-chl;1,1f9;1,-1b4;1,a;1,1;1,h;1,g1;1,-fj;1,6;1,q;1,6n;1,5xr;1,15r;1,-4wp;1,-2kf;1,7;1,egj;1,-e49;1,28b;1,4ex;1,-4mj;1,-1b7;1,2l;1,-8;1,65;1,1q;1,9;1,c;1,-bs;1,3;1,-2;1,9;1,6;1,-b;1,1;1,19;1,-x;1,7;1,13;1,s;1,-q;1,r;1,-a;1,-1;1,-j;1,5;1,9;1,-3;1,1m;1,-9;1,-o;1,12;1,t;1,-14;1,d;1,-x;1,d;1,1h;1,3;1,2;1,-1;1,-7;1,-q;1,1o;1,-5;1,9;1,-k;1,-7;4j,1a;1,2;1,-g;1,-g;1,j;1,u;1,-5;1,17;1,-10;1,1x;1,7;1,l;1,8;1,h;1,-q;1,cvc;1,12p;1,-c2i;1,6ey;1,4;1,2;1,g;1,-5;1,u;1,-10;1,a;1,3;1,6;1,2;1,i;1,d;1,6;1,-e;1,o;1,2;1,p;1,-23;1,v;1,-9;1,t;1,1;1,-b;1,-o;1,b;1,-j;1,9;1,-b;1,11;1,a;1,-16;1,1p;1,14;1,-i;1,-j;1,17;1,-8;1,-17;1,o;1,-y;1,6;1,1g;1,-h;1,-14;1,1q;1,9;1,-k;1,e;1,1;1,-1h;1,-b;1,1z;1,1h;1,a;1,1;1,-2c;1,3u;1,-2e;1,-8;1,-3;1,2y;1,-1p;1,-1b;1,w;1,-8;1,-4;1,s;1,-v;1,-15;1,21;1,-1f;1,d;1,-7;1,1f;1,-1;4j,3;1,-25;1,26;1,3;1,-2;1,3;1,1;1,1u;1,-1k;1,1n;1,1;1,-k;1,a;1,-n;1,9;1,-n;1,-9;1,1m;1,-d;1,-18;1,1n;1,-1p;1,t;1,6;1,a;1,i;1,2;1,5;1,1s;1,-s;1,-d;1,-8nl;1,8pd;1,-d;1,-1a;1,w;1,-13;1,1y;1,s;1,-13;1,-b;1,-1e;1,b;1,1c;1,-c;1,-b;1,1;1,-f;1,-11;1,-5;1,2u;1,-1i;1,-f;1,3f;1,-b;1,9;1,-1;1,q;1,k;1,1;1,-e;1,f;1,-h;1,-1o;1,a;1,z;1,d;1,m;1,2;1,-2l;1,1o;1,2c;1,c;1,3;1,m;1,-15;1,m;1,-9;1,-b;1,-5;1,12;1,-1r;1,o;1,-5;1,-t;1,26;1,-2;1,15;1,-35r;1,36z;1,-20;1,21;1,-q;1,r;4j,s;1,-r;1,-1o;1,-3;1,2l;1,-h;1,w;1,-4;1,-6;1,s;1,-2qg;1,2ox;1,1b;1,9;1,15;1,4;1,-x;1,8;1,-m;1,1h;1,-i;1,-n;1,1g;1,-2;1,-7;1,z;1,-i;1,r;1,z;1,14;1,-y;1,10;1,-j;1,12;1,-7r2;1,a;1,-158;1,5;1,7p2;1,-7oi;1,5;1,-2;1,-18p;1,1sj;1,3;1,7;1,8;1,17c;1,u;1,1h;1,s;1,f;1,g;1,-3;1,n;1,1g;1,-18;1,1v;1,i;1,-8;1,2y;1,21;1,-3p;1,9;1,k;1,12;1,-1z;1,1r;1,-y;1,-x;1,1x;1,e;1,1i;1,6;1,-o;1,v;1,-1n;1,q;1,-g;1,3o;1,-3w;1,-8;1,3r;1,-4;1,-1i;1,g;1,5;1,-k;1,q;1,-5;1,1p;1,12;1,-n;1,15;4j,-s;1,1p;1,1;1,-v;1,x;1,6;1,g;1,7;1,d;1,-2;1,13;1,s;1,9;1,-17n;1,5j;1,47b;1,-4co;1,-2b6;1,42;1,c;1,-k;1,-1;1,j;1,n;1,4;1,-g;1,1x;1,7;1,1;1,1;1,2;1,-j;1,-y;1,1i;1,2;1,-1i;1,f;1,28;1,i;1,-t;1,-6;1,-d;1,1i;1,1;1,-n;1,-e;1,-g;1,1j;1,1f;1,-z;1,l;1,-e;1,u;1,-17;1,-1;1,19;1,1;1,-2q;1,1d;1,1e;1,-q;1,4;1,d;1,d;1,1;1,2;1,-1f;1,1;1,-6;1,1l;1,-e;1,f;1,1p;1,-1g;1,1l;1,-z;1,n;1,-x;1,1b;1,1;1,-k;1,2;1,m;1,3;1,1p;1,14;1,12;1,-30;1,10;1,-18;1,k;1,-m;1,h;1,-k;4j,-5;1,v;1,v;1,1;1,1;1,-1w;1,-3;1,18;1,1b;1,1z;1,-27;1,1a;1,8;1,-1d;1,-7;1,u;1,-x;1,2g;1,-1x;1,-m;1,2s;1,-y;1,1;1,-16;1,5;1,29;1,d;1,-1a;1,2e;1,-26;1,q;1,1;1,-o;1,i;1,-9;1,-p;1,17;1,-a;1,d;1,1;1,-13;1,1;1,r;1,d;1,-h;1,be8;1,-bcm;1,-m;1,4;1,-b;1,z;1,-1;1,-11;1,2;1,13;1,6;1,17;1,-v;1,u;1,-17;1,x;1,l;1,-9;1,3;1,-g;1,8;1,1e;1,-y;1,d;1,-6;1,g;1,1;1,9;1,e;1,s;1,11;1,3;1,6;1,4;1,k;1,-a;1,e;1,6;1,5;1,6;1,-1;1,j;1,1df;1,a;1,-5;1,-3;1,w;1,a;1,1;4j,-5;1,d;1,g;1,7;1,3;1,3;1,-d1;1,-i;1,j;1,3;1,6;1,-e;1,g;1,1;1,-8;1,9;1,2;1,p;1,-j;1,r;1,-h;1,-1;1,6;1,-e;1,u;1,-a;1,d;1,e;1,i;1,-p;1,q;1,t;1,1;1,10;1,-1;1,8;1,-a;1,-6;1,-o;1,l;1,1p;1,-q;1,-a;1,9;1,1b;1,-h;1,k;1,-i;1,e;1,-w;1,-1;1,v;1,b;1,e;1,n;1,4;1,992;1,-98c;1,e;1,by;1,4;1,b;1,5;1,2;1,3;1,9;1,4;1,3;1,c;1,5;1,8;1,7;1,812;1,-83l;1,3t8;1,3;1,4;1,3;1,1;1,b;1,-2;1,d;1,-1;1,5;1,m;1,7;1,-6;1,9;1,2;1,3;1,a;1,-e;1,g;1,-9;4j,1;1,s;1,-4;1,e;1,-n;1,k;1,-1;1,-8;1,d;1,n;1,-k;1,7;1,c;1,-7;1,v;1,-3;1,a;1,9;1,c;1,3;1,f;1,2vx;1,-83a;1,cle;1,-clf;1,-y;1,cpt;1,4;1,1;1,1;1,1;1,1;1,1;1,8;1,3;1,6;1,3;1,4;1,3;1,3;1,3;1,3;1,1;1,2;1,1;1,1;1,-bo5;1,h;1,-6;1,b;1,f;1,-5;1,p;1,-4;1,9;1,-b;1,97k;1,-96p;1,-1;1,a;1,d;1,2;1,6vk;1,-6pi;1,5;1,d;1,-7;1,1g;1,-l;1,m;1,-z;1,3;1,q;1,7;1,1;1,-s;1,3;1,b;1,x;1,s;1,-f;1,-b;1,-c;1,-2;1,s;1,2;1,-x;1,1h;1,-u;1,2f;1,1;1,2;1,-1;1,-1k;4j,14;1,j;1,p;1,4;1,j;1,-g;1,-q;1,f;1,-6;1,f;1,29;1,-1d;1,-a;1,18;1,-5;1,-i;1,k;1,-12;1,30;1,6;1,-h;1,e;1,-1b;1,c;1,e;1,t;1,v;1,17;1,1j;1,-o;1,j;1,g;1,t;1,x;1,-ew;1,aty;1,-5m;1,2;1,6;1,2;1,2;1,1;1,6;1,2;1,5;1,1;1,2;1,2;1,2;1,1;1,1;1,1;1,2;1,3;1,3;1,1;1,1;1,2;1,1;1,-e7i;1,74j;1,-36y;1,200;1,v;1,8;1,-i;1,2h;1,-u;1,b;1,4;1,-8;1,-10;1,1;1,b;1,2;1,g;1,z;1,13;1,4;1,-13;1,22;1,1;1,-7;1,-q;1,-11;1,1a;1,-a;1,10;1,-f;1,3;1,-1p;1,y;1,s;1,f;4j,1n;1,-i;1,-r;1,1j;1,5;1,-1t;1,-3;1,l;1,-b;1,t;1,y;1,-v;1,7;1,-r;1,1h;1,3;1,2;1,-x;1,2m;1,-y;1,1b;1,2;1,-1u;1,1h;1,1;1,-1k;1,4;1,s;1,-p;1,53;1,-2b;1,-2;1,p;1,1c;1,-27;1,x;1,1d;1,-17;1,-9;1,-4;1,1p;1,-2z;1,2p;1,-2m;1,3h;1,1v;1,-w;1,t;1,1z;1,-2b;1,13;1,-1f;1,1;1,-y;1,-d;1,v;1,4b;1,-1a;1,-p;1,20;1,25;1,-23;1,-1p;1,2;1,m;1,-2;1,-4;1,w;1,-z;1,r;1,-1s;1,1f;1,-z;1,5f;1,-s;1,1;1,-z;1,-f;1,-s;1,1i;1,7;1,l;1,15;1,-22;1,-x;1,w;1,2o;1,4;1,-1;1,-k;1,-6;1,a;1,-2;1,2f;4j,-8;1,-y;1,i;1,-3;1,c;1,v;1,d;1,-g;1,2;1,f;1,17;1,9;1,-8;1,u;1,-4;1,q;1,f;1,-44e;1,4;1,h;1,-2;1,i;1,j;1,513;1,7e7;1,-aqy;1,-1n4;1,a;1,8xu;1,-8xs;1,9xz;1,-n4;1,xb;1,t;1,2;1,g;1,9;1,-a;1,5;1,-3;1,d;1,-b;1,t;1,-1;1,7;1,r;1,-l;1,-4;1,9;1,b;1,k;1,1;1,-9;1,2;1,l;1,d;1,1;1,-2;1,o;1,-g;1,a;1,-7;1,-882;1,88r;1,9;1,5;1,6;1,-5;1,8;1,-9q3;1,7;1,-1;1,2;1,-m5;1,-1hs;1,1id;1,9;1,-6g;1,6q;1,3;1,6za;1,-6fm;1,-1;1,4;1,6yv;1,-6yg;1,bun;1,-cel;1,-kt;1,2;1,a;1,s;1,1;1,-7;4j,-c;1,1f;1,-v;1,-d;1,6;1,1a;1,-w;1,-3;1,14;1,-p;1,1z;1,1;1,-15;1,17;1,-11;1,-b;1,x;1,j;1,-3;1,15;1,2;1,-z;1,i;1,-g;1,19;1,13;1,-t;1,b;1,-p;1,12;1,j;1,7lj;1,-7k2;1,-f;1,-10;1,3;1,1w;1,19;1,-1l;1,w;1,2;1,-s;1,14;1,3;1,e;1,-r;1,g;1,-e;1,4;1,19;1,e;1,-1;1,s;1,5;1,9;1,5x;1,7;1,-5e;1,b;1,e;1,-y;1,2;1,f;1,cgj;1,2;1,1;1,2;1,5;1,-2;1,3;1,1;1,4;1,3;1,2;1,6;1,2;1,1;1,3;1,2;1,3;1,1;1,1;1,2;1,1;1,2;1,1;1,2;1,2;1,-5jc;1,2;1,2;1,2;1,3;1,1;4j,4;1,3;1,e;1,2;1,1;1,1;1,7;1,2;1,1;1,4;1,4;1,3;1,4;1,5;1,1;1,7;1,3;1,3;1,1;1,2;1,1;1,r;1,-n;1,4;1,1;1,3;1,3;1,1;1,1;1,4;1,1;1,3;1,1;1,3;1,2;1,1;1,5;1,2;1,3;1,-1;1,4;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,2;1,-6gr;1,4jp;1,-4o4;1,4mb;1,5ef;1,-5qf;1,3;1,t;1,-c;1,-3;1,1c;1,-d;1,f;1,-q;1,-4;1,d;1,9;1,-1;1,t;1,-c;1,78j;1,-776;1,-x;1,-2;1,-9;1,-10;1,1k;1,t;1,r;1,1d;1,-1h;1,-1;1,3;1,8;1,-2;1,-2;4j,-h;1,-1;1,13;1,r;1,-5;1,-2;1,4;1,u;1,-a;1,h;1,u;1,-e;1,-e;1,1;1,6;1,4;1,j;1,a;1,1;1,-p;1,n;1,17;1,-o;1,6y8;1,1;1,1;1,-9ls;1,7;1,b;1,-m;1,x;1,1o;1,-u;1,-t;1,9;1,11;1,f;1,-1e;1,1f;1,-a;1,f;1,-y;1,-k;1,5;1,38;1,p;1,-1d;1,1e;1,-x;1,-1l;1,2k;1,-1f;1,-10;1,11;1,-13;1,16;1,z;1,-1p;1,-b;1,16;1,18;1,-25;1,1o;1,1h;1,1;1,19;1,1;1,-j;1,k;1,-u;1,w;1,v;1,-2u;1,1k;1,h;1,-11;1,12;1,-13;1,-2;1,c;1,-1;1,-w;1,3w;1,-12;1,-r;1,3;1,s;1,-14;1,2f;1,4s;1,-36;1,z;1,1;1,-13;4j,17;1,-1g;1,r;1,-a;1,2e;1,-38;1,19;1,2p;1,-1k;1,13;1,-u;1,r;1,13;1,-p;1,l;1,o;1,-w;1,-1w;1,48;1,-1x;1,1;1,1y;1,-1x;1,-z;1,-3;1,m;1,y;1,c;1,k;1,-g;1,2;1,13;1,-z;1,g;1,9;1,l;1,-22;1,23;1,-2b;1,36;1,1c;1,-1u;1,16;1,1;1,25;1,-37;1,2a;1,-6;1,2q;1,-28;1,b;1,-12;1,2h;1,-l;1,-1o;1,-l;1,1c;1,10;1,l;1,-1;1,p;1,-i;1,k;1,1os;1,r;1,-1jl;1,1;1,5;1,-3;1,e;1,1;1,-6;1,d;1,1;1,6;1,9;1,729;1,2;1,4;1,1;1,1;1,2;1,1;1,2;1,-1;1,2;1,1;1,2;1,2;1,3;1,1;1,2;1,3;1,4;4j,2;1,1;1,1;1,9;1,2;1,-5o;1,-8ub;1,c;1,4;1,4;1,3;1,-1;1,4;1,-1;1,8;1,69n;1,-2k8;1,5;1,b;1,g;1,2;1,2;1,-34v;1,56;1,1;1,1;1,q;1,f;1,9l;1,-a7;1,i;1,-l;1,22t;1,-1vy;1,-62;1,n;1,-3;1,5;1,-1;1,53l;1,-52f;1,-b;1,-j;1,e;1,7;1,b;1,-a;1,w;1,d;1,8;1,r;1,-a;1,x;1,t;1,1;1,a;1,3;1,7k9;1,1;1,3;1,5;1,2;1,3;1,5;1,1;1,2;1,1;1,-2;1,6;1,8;1,4;1,-pe;1,3;1,1;1,1;1,2;1,1;1,1;1,1;1,-4mb;1,1d;1,-1u;1,9;1,9;1,f;1,1;1,5;1,7;1,2;1,2;1,3;1,-32i;1,16;1,3i;4j,3z;1,49;1,5d8;1,-3yy;1,9;1,a;1,-8;1,4;1,c;1,2;1,-1;1,7;1,8;1,3;1,1;1,1;1,7;1,8;1,-5;1,6;1,8;1,-1dp;1,w;1,m;1,2jm;1,5;1,4;1,-12;1,3zm;1,-abw;1,96x;1,-3;1,-9;1,15;1,-52q;1,52r;1,-c;1,-6;1,2;1,7;1,3;1,1c;1,1;1,1;1,1;1,-f;1,-p;1,2;1,l;1,-c;1,a;1,-53b;1,53h;1,e;1,6;1,3;1,-7;1,w;1,1;1,-s;1,a;1,-547;1,54t;1,288;1,-278;1,-o;1,e;1,-k;1,q;1,m;1,4;1,7;1,x;1,-r;1,1;1,n;1,-h;1,9;1,j;1,1;1,-g;1,-6;1,-84a;1,h4;1,7o3;1,-6;1,f;1,-3p8;1,3pq;1,7;1,y;1,-59i;1,59g;1,-f;4j,6;1,-r;1,-4g2;1,j;1,2;1,a;1,3;1,j;1,8zc;1,1;1,1;1,2;1,4;1,1;1,-8x3;1,-2gj;1,2gy;1,5yp;1,-76r;1,bep;1,-bem;1,15;1,a;1,-2;1,-1;1,9;1,2;1,4;1,4;1,23u;1,s;1,-6;1,7;1,u;1,5;1,-9;1,-c;1,6;1,1j;1,-u;1,1y;1,3;1,3;1,p;1,2;1,1u;1,-n;1,c;1,-z;1,19;1,-14;1,1a;1,2;1,u;1,r;1,2;1,-d;1,-8;1,1s;1,-c;1,j;1,i;1,10;1,b;1,-cc;1,4s;1,26;1,2b;1,-323;1,-1;1,6;1,5;1,1;1,4j6;1,5;1,6;1,3;1,i;1,1;1,-9;1,7;1,8;1,-b;1,9;1,f;1,-8;1,j;1,b;1,5;1,g;1,d;1,c;1,-542;1,-1;4j,30;1,x;1,-3;1,d;1,-12;1,o;1,a;1,20;1,2j;1,7;1,28;1,24;1,-c;1,1a;1,6;1,1h;1,60q;1,-1;1,-3xo;1,2r;1,7a;1,1yy;1,2;1,8;1,9;1,e;1,1;1,-7;1,-3mu;1,3nm;1,-h;1,1;1,s;1,1;1,1;1,-s;1,t;1,-n;1,7;1,-9;1,6;1,11;1,v;1,-n;1,1;1,-1d;1,16;1,-9;1,5;1,u;1,1d;1,-8;1,7;1,-j;1,l;1,5;1,2;1,f;1,7;1,-k;1,1b;1,5;1,-g;1,z;1,6;1,j;1,-h;1,v;1,h;1,-6;1,m;1,7l3;1,-4i;1,2;1,1;1,-7wr;1,j;1,9;1,-k;1,e;1,1;1,i;1,8;1,-9;1,k;1,-7;1,f;1,3;1,o;1,1;1,-a;1,-4;1,n;1,e;4j,-6;1,3;1,q;1,e;1,-g;1,3;1,c;1,5;1,e;1,1;1,g;1,5;1,8;1,-hv;1,6;1,e;1,-3;1,-3;1,j;1,n;1,7;1,a;1,1xx;1,9;1,-2;1,25l;1,-25c;1,c;1,-3;1,8;1,8;1,-3;1,-1pt;1,o;1,3f1;1,2fn;1,1;1,1;1,4;1,-1;1,2;1,1;1,2;1,1;1,4;1,3;1,-2;1,5;1,1;1,1;1,7;1,1;1,7;1,-1;1,3;1,-1;1,3;1,1;1,2;1,2;1,2;1,1;1,1;1,1;1,1;1,2;1,1;1,2;1,5;1,4;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,3;1,1;1,1;1,2;1,-1;1,3;1,3;1,1;1,1;1,2;1,2;1,1;1,2;1,1;1,2;4j,-1;1,2;1,3;1,1;1,4;1,1;1,1;1,2;1,2;1,3;1,1;1,2;1,4;1,-1;1,4;1,1;1,2;1,1;1,3;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,2;1,3;1,2;1,1;1,1;1,3;1,8;1,1;1,-2;1,3;1,5;1,1;1,2;1,2;1,1;1,1;1,4;1,2;1,1;1,3;1,-d;1,f;1,1;1,1;1,3;1,3;1,2;1,1;1,3;1,1;1,1;1,2;1,1;1,1;1,1;1,2;1,3;1,1;1,-2;1,4;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,1;1,1;1,-1l;1,-5sj;1,5;1,63h;1,-5pw;1,o;1,-a;1,8;1,r;1,-5of;1,5oc;1,-1;1,s;1,-a;4j,11;1,-2;1,q;1,77i;1,-10q;1,-65x;1,-rs;1,6;1,5;1,6;1,b;1,-cm;1,2;1,24;1,838;1,2;1,6;1,1;1,1;1,1;1,1;1,6;1,-1;1,5;1,2;1,-1;1,2;1,1;1,4;1,3;1,1;1,2;1,2;1,1;1,1;1,1;1,2;1,1;1,2;1,3;1,4;1,2;1,3;1,1;1,1;1,2;1,5;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,5;1,-4;1,6;1,-82p;1,2;1,2;1,a;1,-3;1,f;1,-9;1,g;1,1;1,4;1,c;1,-j;1,-1;1,j;1,-1;1,k;1,-9;1,m;1,5;1,-2;1,-2;1,7;1,-4;1,s;1,-i;1,b;1,3;1,h;1,-g;1,5;1,7;1,b;1,-d;1,r;1,-d;1,-3;1,4;4j,2;1,x;1,-q;1,-2;1,w;1,-j;1,3;1,f;1,-a;1,e;1,-5;1,-b;1,q;1,h;1,-a;1,8;1,-6;1,l;1,4;1,1uj;1,-ys;1,-32;1,1;1,7;1,6;1,2;1,d;1,h;1,-6;1,c;1,-4;1,5;1,6;1,2pd;1,5;1,9;1,b;1,2;1,3;1,w;1,10;1,-f;1,5;1,d;1,p;1,-k;1,l;1,2;1,c;1,15;1,-u;1,-k;1,m;1,-e;1,1d;1,-8;1,-6;1,8;1,-h;1,16;1,-9;1,b;1,b;1,11;1,l;1,-3xs;1,28q;1,-20j;1,2;1,88;1,1me;1,2;1,2;1,6;1,4;1,2;1,3;1,1;1,1;1,2;1,-1;1,9;1,-12;1,16;1,e;1,3;1,7;1,5;1,n;1,8;1,1si;1,2yd;1,8;1,3;4j,6;1,3;1,1;1,2;1,5;1,6;1,1;1,3;1,1;1,2;1,1;1,3;1,1;1,-3mh;1,7;1,o;1,2;1,h;1,-5;1,2;1,-1;1,19;1,-r;1,-2;1,x;1,-f;1,a;1,-4;1,7;1,-n;1,m;1,d;1,e;1,-f;1,p;1,-u;1,a;1,-9;1,-2;1,q;1,6;1,-r;1,1h;1,8;1,1;1,-5;1,6;1,-z;1,1v;1,-1h;1,m;1,-l;1,-7;1,-7;1,1e;1,4;1,-f;1,g;1,2;1,3;1,-4;1,q;1,o;1,-t;1,7;1,9;1,-k;1,10;1,a;1,-k;1,-3;1,-8;1,e;1,8;1,1v;1,-2o;1,2j;1,1;1,-3;1,-r;1,g;1,-10;1,y;1,t;1,-1k;1,g;1,p;1,-o;1,-b;1,c;1,1a;1,s;1,-7;1,16;4j,-c;1,-1q;1,-3;1,14;1,-m;1,-k;1,14;1,1m;1,-1l;1,9;1,-2;1,o;1,8;1,-m;1,k;1,-h;1,a;1,h;1,f;1,-a;1,e;1,14;1,-3;1,-l;1,c;1,h;1,6;1,o;1,3;1,-1s6;1,c;1,2;1,1;1,jv;1,-1ee;1,3;1,b;1,-5;1,1;1,h;1,-b;1,x;1,-s;1,1k;1,-f;1,-e;1,-h;1,l;1,3;1,-h;1,5;1,-1;1,f;1,b;1,-w;1,1m;1,2;1,-l;1,1c;1,-15;1,h;1,3;1,e;1,d;1,-p;1,g;1,-1;1,v;1,m;1,1;1,h;1,-c;1,-f;1,b;1,-z;1,11;1,-e;1,6;1,9;1,9;1,t;1,-g;1,b;1,h;1,-3;1,b;1,1;1,4;1,y;1,-e;1,-2;1,j;1,7;1,-b;4j,k;1,b;1,-4;1,i;1,9;1,-1;1,14u;1,3;1,1;1,2;1,-o;1,194;1,-17n;1,1;1,1;1,a;1,2;1,-7;1,3;1,d;1,3;1,-8;1,1;1,a;1,6;1,5;1,2;1,4;1,b;1,5;1,9;1,17a;1,7;1,3;1,28;1,7;1,3j;1,-1xd;1,2;1,8;1,8;1,1;1,2;1,-mu;1,-4kz;1,4lk;1,c;1,-1;1,2;1,4;1,g;1,a;1,1;1,4;1,6;1,5;1,1;1,-5;1,-3;1,i;1,h;1,13a;1,-5hi;1,4yf;1,f;1,7;1,g;1,-4;1,5;1,3;1,5;1,5;1,-l7;1,3j;1,1b;1,8;1,49;1,2c;1,6cd;1,-4;1,-3ep;1,h;1,g;1,-3;1,w;1,-22;1,6;1,-86;1,2;1,zl;1,6;1,-2;1,1;1,l;4j,-2;1,-1;1,f;1,-7;1,6;1,e;1,1;1,-c;1,2;1,5;1,j;1,-7;1,b;1,-3;1,4;1,h;1,1;1,7;1,3;1,1;1,1;1,6;1,-1;1,6;1,-12d;1,3l5;1,-3ba;1,1f;1,q;1,2c;1,g;1,-50;1,a;1,-3;1,-2;1,a;1,i;1,1;1,3;1,4;1,-g;1,1;1,c;1,-l;1,12;1,b;1,1;1,-l;1,m;1,2;1,-n;1,11;1,-c;1,n;1,9;1,2;1,d;1,2;1,-b;1,c;1,b;1,6;1,-7;1,-4;1,8;1,-c;1,o;1,-8;1,1;1,f;1,1;1,-8;1,12;1,6;1,6;1,-d;1,5;1,h;1,a;1,5;1,-4;1,c;1,2;1,-fa;1,a;1,8;1,-5;1,j;1,-4;1,-7p5;1,75n;1,8;1,-4;1,2;4j,9;1,6;1,4;1,27;1,6g;1,2el;1,-2y;1,a;1,-4;1,n;1,-5;1,7;1,7;1,-1;1,s;1,3;1,3;1,e;1,1mq;1,3;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,-3y;1,d;1,2;1,-1n8;1,3;1,1;1,h;1,4;1,-64z;1,65d;1,-uq;1,w;1,q;1,3a;1,18;1,2o;1,-1n;1,4v;1,19;1,1lg;1,3;1,3;1,1;1,1;1,1;1,-6sl;1,6so;1,3;1,2;1,1;1,1;1,2;1,1;1,5;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,2;1,2;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,7;1,1;1,1;1,1;1,3;1,1;4j,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,2;1,1;1,1;1,3;1,1;1,2;1,3;1,-12e;1,9;1,c;1,1;1,2;1,r;1,-4;1,-8;1,f;1,2;1,l9;1,-1;1,7;1,pt;1,-pu;1,4;1,2;1,5;1,-1;1,5;1,-3;1,9;1,1;1,5;1,38;1,-2;1,4;1,2;1,-1;1,5;1,4;1,-h5;1,11;1,x;1,13;1,-1;1,az;1,2;1,5;1,9;1,-4;1,g;1,-e;1,c;1,f;1,7;1,4;1,c;1,4;1,pm;1,1;1,-6f7;1,6dj;1,5;1,1;1,3;1,7;1,-24c;1,24n;1,2;1,1o;1,1;1,1;1,3;1,-1;1,3;1,7;1,-2;1,-2;1,5;1,5;1,1f;1,a;1,3;1,a;1,-2;1,6;1,1;1,6",
	CP949: "pj5,xz6;1,1;1,2;1,1;1,5;1,1;1,1;1,1;1,1;1,9;1,6;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;7,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;7,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,3;1,5;1,1;1,5;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,4;1,2;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,2;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1,2;1,2;1,1;1,4;1,2;1,3;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1v,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,3;1,1;1,1;1,1;1,1;1,1;7,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;7,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,5;1,1;1,1;1,1;1,4;1,2;1,3;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1v,3;1,1;1,2;1,1;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1,2;1,1;7,1;1,1;1,1;1,3;1,2;1,3;1,1;1,1;1,2;1,4;1,2;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,2;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,4;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1v,1;1,1;1,2;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,3;1,1;1,1;1,1;1,2;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,4;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1v,1;1,2;1,1;1,1;1,1;1,1;1,1;1,4;1,2;1,3;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;7,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,2;1,2;1,2;1,1;1,1;1,1;1,4;1,2;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,4;1,2;1,1;1,5;1,1;1v,1;1,1;1,1;1,3;1,6;1,2;1,4;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;7,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,3;1,1;1,1;1,2;1,3;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,4;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,4;1,1;1,1;1,2;1,1;1,1;1,2;1v,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;7,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1v,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,2;1,1;1,1;1,1;1,1;7,1;1,3;1,1;1,2;1,1;1,1;1,4;1,1;1,1;1,1;1,1;1,3;1,2;1,3;1,1;1,1;1,2;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,2;1,4;1,2;1,1;1,6;1,1;1,1;1,4;1,6;1,1;1,1;1,4;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,4;1,2;1,1;1,3;1,3;1,1;1,1;1,1;1v,3;1,2;1,2;1,2;1,1;1,2;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,2;7,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1,2;1,2;1,1;1,1;1,3;1,2;1,2;1,2;1,2;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1v,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;7,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;7,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1v,1;1,1;1,1;1,1;1,1;1,1;1,3;1,5;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;7,1;1,1;1,1;1,1;1,4;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,3;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,4;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1v,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1v,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;7,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,5;1,1;1,1;1,5;1,1;1,2;1,1;1v,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,4;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1v,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;7,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1v,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;7,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,3;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,6;1,1;1,1;1,1;1,1;1,3;1,2;1,3;1,1;1,2;1,4;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,5;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1v,1;1,3;1,2;1,3;1,1;1,1;1,1;1,4;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;7,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,4;1,2;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,3;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1v,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,4;1,2;1,1;1,5;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,2;1,3;1,1;7,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1v,2;1,1;1,1;1,1;1,1;1,3;1,4;1,2;1,2;1,1;1,6;1,1;1,6;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,2;1,1;1,3;1,1;1,2;7,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,2;1,1;1,3;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,3;1,2;1,3;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,4;1,1;1,1;1,2;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,4;1,2;1,1;1,1;1,2;1v,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,5;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1v,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,2;7,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;7,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,3;1,2;1,4;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,4;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1v,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;7,2;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,4;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1v,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1v,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;7,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,3;1,1;1,5;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,2;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,6;1,1;1,3;1,3;1,1;1,1;1,1;1,3;1v,4;1,1;1,1;1,1;1,2;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;7,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,4;1,2;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,2;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1,1;1,1;1v,1;1,1;1,1;1,1;1,3;1,2;1,2;1,2;1,3;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,2;7,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,4;1,2;1,2;1,1;1,1;1,1;1,2;1,3;1,3;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,3;1,1;1v,1;1,1;1,1;1,4;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,3;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1v,1;1,2;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1v,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,4;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,4;1,4;1,1;1,1;1,1;1,4;1,4;1,1;1,1;1,3;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,2;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1v,2;1,3;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;7,1;1,3;1,5;1,1;1,1;1,1;1,1;1,8;1,2;1,2;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;7,1;1,1;1,1;1,1;1,4;1,2;1,1;1,1;1,2;1,3;1,1;1,1;1,1;1,7;1,1;1,1;1,5;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,4;1,2;1,1;1,4;1,2;1,2;1,2;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1v,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,4;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;7,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;7,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,2;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,2;1,3;1,2;1,9;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,4;1,1;1,1;1,1;1,4;1,5;1,1;1,1;1,2;1,3;1,1;1,2;1,4;1,2;1,1;1,1;1,1;1,1;1,3;1,5;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1v,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;7,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,3;1,2;1,3;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,3;1,2;1,4;1,1;1,1;1,4;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,2;1,2;1,1;1,1;1v,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;7,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,4;1,1;1,1;1,1;1,1;1,3;1,-u8e;1,1;1,1;1,-9cb;1,67i;1,1;1,-67y;1,9cr;1,-9cm;1,67c;1,eo;1,17o7;1,-17nk;1,-f8;1,1;1,3;1,1;1,35j;1,1;1,-d;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-9cw;1,12;1,w;1,6ll;1,4;1,1;1,-1z;1,m;1,-6mc;1,682;1,1;1,5s;1,14;1,17zp;1,1;1,4;1,-16zn;1,-2;1,-tc;1,3p;1,31;1,-7k;1,5;1,2i;1,-f;1,-6nf;1,68k;1,157;1,-1;1,-1m;1,4;1,-1;1,-7;1,-1;1,-11;1,-1;1,j;1,-1;1,b;1,-1;1,-tm;1,-2;1,1;1,2;1,1;1,2v3;1,-2p5;1,1;1,-29;1,z;1,-w;1,o;1,-a;1,1;1,-10;1,3;1,3f;1,1;1,-5;1,1;1,-2h;1,-1;1,-2;1,1;1,17sq;1v,-atu;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,-x3x;1,2;1,18;1,3;1,-6kv;1,1eay;1,-1dw7;1,h;1,5;1,-3;1,-1;1,-f5;1,f7;1,-fu;1,u;1,ep;1,672;1,-t;1,-2;1,-6ln;1,6ed;1,-61;1,13l;1,-1;1,-9;1,-1;1,4u;1,-4;1,1;1,4;1,2;1,-4;1,-qy;1,mn;1,-11;1,19;1,1;1,-1r;1,i;1,1;1,3;1,-1;1,-1;1,3;1,5b;1,-2h;1,-1;1,e;1,2;1,-7e0;1,67e;1,1;1,ac;1,2;1,2;1,-3;1,2;1,yd;1,-4;1,1;1,2;1,2dv;1,-2r;1,-3d2;1,3ox;1,-3ol;1,3og;1,m;1,-3p3;1,-39;1,-6bi;2i,13nn;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;7,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,3;1,2;1,3;1,1;1,3;1,ahy;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,4r;1,-4p;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3q;1v,-ao5;1,1;1,2;1,2;1,2;1,1;1,2;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;7,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-u8l;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1v,u61;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,2;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-xfb;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;6,-p;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;8,-5w8;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;9,8;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;21,13a7;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;7,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,2;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,-wsq;1,2;1,a;1,4;1,8;1,-4;1,8;1,g;1,-8;1,g;1,8;1,-1n;1,2;1,c;1,4;1,8;1,-4;1,c;1,g;1,-8;1,g;1,g;1,-17;1,f;1,-7;1,f;1,8;1,-y;1,j;1,-b;1,j;1,a;1,-1c;1,-1;1,9;1,-1;1,-3;1,-1;1,-7;1,-1;1,h;1,1;1,2;1,1;1,4;1,1;1,2;1,1;1,3;1,1;1,3;1,1;1,3;1,1;1,3;1,1;1,3;1,1;1,2;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2l,wqp;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;7,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-tzr;1,1;1,1;1,-3no;1,3np;1,18;1,-x;1,1;1,1;1,1;1,-d;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,14;1,-1p;1,1;1,1;1,1s;1,-1z;1,1;1,1r;1,-x;1,1;1,8;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-1l;1,1;1,1;1,1;1,1;1,1i;1,1;1,1;1,1;1,1;1,1;1,-1b;1,1;1,1;1,1;1,1;1,-3n2;1,3oa;1,1;1,-1j;1,1;1,1;1,22;1,-h;1,-o;1,1;1,1;1,18;1,-1e;1,1;1,1;1,1;1,1d;1,-d;1,3;1,-g;1,6;1,j;1,-m;2a,tyf;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-143i;1,a;1,-12;1,3g;2,c;2,d;1,2;1,-2x;1,3e;1,-48;1,10;1,3s;1,-s;2,9p2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-2p7;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-3t;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-71t;1,6fq;1,1;1,-6fs;1,2;1,6fx;1,1;1,1;1,1;1v,xnr;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,2;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,3;1,1;1,-145a;1,17;1,-x;1,1j;1,a;1,2;1,5;1,8;1,2;1,-22;1,2j;1,-38;1,v;1,2x;1,-s;1,-2;1,9mf;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-2nz;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-1t;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-72h;1,-7;1,1;1,69t;1,b;1,2;1,1;1,1;1,1;1v,xwh;1,1;1,4;1,1;1,2;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,5;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;7,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;7,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-uvm;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;26,utd;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;7,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-uvw;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;23,utk;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;7,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,-13rj;1,1;1,1;1,1;1,1;1,1;1,-k;1,l;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;g,1;1,1;1,1;1,1;1,1;1,1;1,s;1,-r;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;28,13pu;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;7,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;4h,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;7,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;4h,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,2;7,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;4h,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,-6wv;1,1;1,3;1,3;1,1;1,1;1,1;1,6;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,4;1,b;1,2;1,7;1,4;1,4;1,k;1,1;1,3;1,3;1,1;1,2;1,6;1,1;1,2;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,4;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,1;1,2;1,3;1,1;1,8;1,1;1,2;1,1;1,1;1,4;1,3;1,4;1,4;1,9;1,2;1,9;1,1;1,3;1,3;1,1;1,2;1,2;1,3;1,1;1,1;1,2;1,2;1,1;1,6;1,1;1,3;1,4;1,2;1v,6po;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;7,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,-6sg;1,1;1,2;1,2;1,7;1,4;1,4;1,9;1,3;1,1;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,4;1,4;1,9;1,2;1,9;1,1;1,3;1,3;1,1;1,1;1,1;1,5;1,1;1,1;1,2;1,2;1,1;1,6;1,1;1,3;1,4;1,c;1,1;1,7;1,j;1,9;1,1;1,3;1,4;1,8;1,1;1,2;1,9;1,4;1,4;1,k;1,1;1,3;1,3;1,1;1,1;1,7;1,1;1,2;1,2;1,7;1,s;1,1;1,3;1,3;1,1;1,2;1,6;1,1;1,2;1,2;1,1;1,4;1,2;1,1;1,1;1,2;1,4;1,2;1,6;1,1;1,2;1,1;1,1;1,4;1,3;1,1;1,3;1,4;1,8;1v,6id;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,2;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,2;7,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,-6ky;1,2;1,1;1,1;1,7;1,1;1,7;1,1c;1,1;1,1;1,2;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,c;1,3;1,2;1,7;1,4;1,4;1,b;1,1;1,5;1,3;1,s;1,1;1,3;1,2;1,2;1,8;1,1;1,2;1,2;1,1;1,1;1,5;1,1;1,7;1,c;1,1;1,7;1,1;1,k;1,7;1,4;1,4;1,8;1,1;1,4;1,7;1,s;1,1;1,3;1,4;1,7;1,1;1,1;1,2;1,2;1,1;1,6;1,8;1,c;1,1;1,7;1,1;1,3;1,4;1,8;1,1;1,3;1,8;1,4;1,4;1,8;1,1;1,b;1,s;1,1;1,3;1,2;1,2;1,2;1,5;1,1;1,1;1,2;1,2;1v,67n;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;7,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-6a7;1,v;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,1;1,2;1,3;1,1;1,1;1,1;1,6;1,1;1,2;1,1;1,1;1,1;1,1;1,2;1,2;1,1;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,4;1,8;1,5;1,z;1,1;1,2;1,1;1,4;1,2;1,1;1,5;1,1;1,2;1,1;1,1;1,6;1,1;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,4;1,8;1,1;1,3;1,1;1,3;1,4;1,4;1,o;1,1;1,3;1,4;1,2;1,6;1,1;1,2;1,2;1,5;1,1;1,1;1,4;1,4;1,c;1,10;1,4;1,4;1,8;1,1;1v,5zl;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;7,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;7,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-62d;1,9;1,1;1,3;1,4;1,9;1,2;1,2;1,7;1,1;1,3;1,3;1,1;1,8;1,1;1,2;1,2;1,7;1,k;1,8;1,s;1,4;1,4;1,8;1,1;1,b;1,1;1,7;1,8;1,1;1,4;1,7;1,1;1,3;1,4;1,1;1,1;1,6;1,1;1,2;1,2;1,1;1,4;1,2;1,4;1,4;1,k;1,1;1,3;1,4;1,2;1,6;1,1;1,2;1,2;1,5;1,2;1,1;1,1;1,2;1,3;1,1;1,1;1,1;1,1;1,4;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,4;1,1;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1k;1,1;1,1;1,2;1,3;1,1;1,2;1,1;1,5;1,1;1v,5rk;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;7,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;7,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-5ul;1,2;1,2;1,3;1,2;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,4;1,4;1,c;1,1;1,7;1,4;1,o;1,1;1,3;1,3;1,1;1,2;1,2;1,4;1,1;1,2;1,2;1,2;1,2;1,3;1,4;1,4;1,k;1,k;1,8;1,4;1,4;1,8;1,1;1,2;1,9;1,s;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,k;1,8;1,l;1,7;1,4;1,4;1,9;1,2;1,2;1,7;1,4;1,4;1,8;1,5;1,7;1,1;1,3;1,3;1,1;1,2;1,6;1,1;1,2;1,2;1,7;1,s;1,1;1,3;1,3;1,1;1,8;1,1;1,2;1,1;1,1;1,1;1,6;1,1;1,3;1,4;1v,5hp;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,2;1,1;1,1;1,1;7,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,-5kd;1,1;1,2;1,1;1,1;1,6;1,1;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,1r;1,1;1,3;1,4;1,2;1,1;1,5;1,1;1,2;1,1;1,1;1,6;1,1;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,k;1,10;1,1;1,3;1,4;1,d;1,7;1,8;1,k;1,s;1,4;1,1g;1,1;1,3;1,4;1,7;1,1;1,5;1,z;1,s;1,4;1,4;1,8;1,1;1,4;1,z;1,1;1,3;1,3;1,1;1,8;1,1;1,2;1,9;1,4;1,4;1,8;1,1;1,b;1,4;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,1;1,4;1,1;1v,53r;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;7,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,2;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-56f;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,f;1,2;1,z;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,6;1,1;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,4;1,d;1,2;1,9;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,4;1,h;1,r;1,8;1,4;1,4;1,8;1,1;1,2;1,2;1,7;1,4;1,4;1,9;1,2;1,2;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,k;1,8;1,s;1,1;1,3;1,4;1,8;1,3;1,2;1,7;1,1;1,3;1,4;1,8;1,1;1v,4tj;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-4vy;1,2;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,1;1,3;1,1;1,u;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,6;1,1;1,2;1,2;1,1;1,3;1,2;1,1;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,1;1,6;1,1;1,7;1,d;1,z;1,1;1,3;1,4;1,2;1,6;1,1;1,2;1,2;1,1;1,5;1,1;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,4;1,b;1,1;1,1;1,2;1,5;1,s;1,1;1,2;1,1;1,4;1,2;1,6;1,1;1,2;1,2;1,7;1,4;1,g;1,1;1,z;1v,4ku;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,-4ng;1,4;1,9;1,2;1,2;1,7;1,4;1,4;1,9;1,2;1,9;1,1;1,1;1,2;1,3;1,1;1,1;1,1;1,6;1,1;1,2;1,2;1,4;1,2;1,1;1,4;1,4;1,9;1,2;1,9;1,s;1,4;1,4;1,k;1,4;1,4;1,8;1,3;1,9;1,4;1,4;1,8;1,3;1,11;1,1;1,3;1,3;1,1;1,2;1,6;1,1;1,2;1,1;1,1;1,2;1,2;1,3;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,5;1,1;1,2;1,2;1,4;1,3;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,4;1,3;1,1;1,3;1,d;1,13;1,1;1,3;1,3;1,1;1,2;1,6;1,1;1,2;1v,4c6;1,1;1,1;1,3;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;7,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,-4f5;1,1;1,6;1,1;1,3;1,3;1,1;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,4;1,9;1,2;1,1;1,1;1,4;1,3;1,4;1,o;1,1;1,1;1,2;1,4;1,8;1,1;1,2;1,2;1,7;1,4;1,g;1,8;1,k;1,8;1,1;1,3;1,4;1,8;1,1;1,b;1,4;1,o;1,1;1,3;1,3;1,1;1,1;1,1;1,6;1,1;1,2;1,2;1,4;1,1;1,2;1,8;1,c;1,8;1,s;1,1;1,3;1,4;1,d;1,7;1,4;1,4;1,8;1,3;1,2;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,11;1,1;1,3;1,4;1,2;1,6;1,1;1,2;1,2;1,1;1,1;1,5;1,1;1,3;1v,42f;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,4;1,2;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,3;1,4;1,1;7,1;1,2;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-45d;1,2;1,6;1,1;1,2;1,1;1,1;1,6;1,1;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,f;1,14;1,1;1,3;1,3;1,1;1,8;1,3;1,1;1,1;1,7;1,l;1,7;1,1;1,f;1,1;1,2;1,1;1,1;1,z;1,1;1,3;1,4;1,8;1,1;1,4;1,1r;1,s;1,l;1,7;1,1;1,3;1,4;1,8;1,3;1,2;1,2j;1,l;1,7;1,4;1,4;1,8;1,1;1,13;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,2;1,1;1,3;1,1;1,1;1,1;1,6;1,1;1,2;1,1;1,1;1,4;1,3;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1v,3nq;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;7,1;1,1;1,1;1,1;1,3;1,4;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;7,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,3;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,-3qp;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,4;1,4;1,8;1,5;1,7;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,5;1,1;1,2;1,1;1,1;1,5;1,2;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,4;1,4;1,d;1,7;1,1;1,1;1,2;1,4;1,2;1,6;1,1;1,2;1,2;1,4;1,3;1,1;1,3;1,4;1,d;1,7;1,4;1,4;1,8;1,3;1,1;1,8;1,4;1,4;1,8;1,1;1,2;1,9;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,3;1,3;1,1;1,8;1,1;1,2;1,2;1v,3hm;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;7,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-3k8;1,2;1,1;1,2;1,k;1,8;1,1;1,3;1,4;1,8;1,5;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,7;1,8;1,3;1,2;1,7;1,1;1,3;1,4;1,1;1,7;1,1;1,2;1,2;1,z;1,1;1,3;1,3;1,1;1,7;1,1;1,1;1,2;1,2;1,5;1,2;1,1;1,2;1,1;1,4;1,8;1,1;1,3;1,1;1,6;1,1;1,1;1,3;1,4;1,8;1,1;1,3;1,1;1,s;1,z;1,1;1,3;1,4;1,2;1,6;1,1;1,3;1,1;1,7;1,4;1,4;1,1g;1,o;1,1;1,3;1,3;1,1;1,2;1,6;1,1;1,4;1,7;1,1;1,3;1,g;1,8;1,k;1,8;1,4;1v,360;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,2;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-38p;1,8;1,1;1,b;1,s;1,1;1,3;1,4;1,8;1,1;1,4;1,7;1,k;1,8;1,s;1,4;1,19;1,7;1,1;1,3;1,4;1,2;1,5;1,1;1,1;1,b;1,4;1,4;1,8;1,c;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,3;1,1;1,1;1,2;1,1;1,1;1,5;1,1;1,1;1,2;1,1;1,1;1,4;1,1;1,2;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,4;1,3;1,5;1,1;1,2;1,2;1,4;1,2;1,1;1,4;1,4;1,9;1,b;1,1;1,3;1,1;1,2;1,1;1,1;1,1;1,6;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,2;1v,2xc;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;7,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,2;1,-2zw;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,1;1,2;1,4;1,2;1,1;1,5;1,1;1,1;1,1;1,1;1,1;1,4;1,1;1,1;1,1;1,4;1,4;1,8;1,1;1,2;1,1;1,8;1,1;1,3;1,4;1,1;1,1;1,2;1,3;1,1;1,1;1,2;1,2;1,2;1,5;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,c;1,3;1,2;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,3;1,4;1,1;1,1;1,6;1,1;1,2;1,2;1,7;1,1;1,3;1,4;1,8;1,1;1,3;1,1;1,7;1v,2s6;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,-2uy;1,3;1,4;1,8;1,1;1,4;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,2;1,5;1,1;1,3;1,4;1,6;1,2;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,4;1,4;1,8;1,3;1,9;1,1;1,3;1,4;1,1;1,1;1,5;1,1;1,1;1,2;1,1;1,1;1,1;1,4;1,2;1,1;1,3;1,2;1,1;1,1;1,2;1,6;1,1;1,2;1,1;1,1;1,1;1,6;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,2;1,2;1,8;1,5;1,7;1,4;1,4;1,k;1,1;1,3;1,4;1,2;1v,2my;1,2;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,4;1,1;7,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;7,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-2pj;1,1;1,2;1,2;1,1;1,6;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,4;1,4;1,8;1,1;1,3;1,1;1,7;1,s;1,1;1,3;1,4;1,2;1,6;1,1;1,2;1,2;1,1;1,1;1,4;1,1;1,1;1,7;1,9;1,2;1,2;1,7;1,k;1,1;1,7;1,4;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,3;1,h;1,7;1,1;1,3;1,4;1,1;1,1;1,6;1,1;1,2;1,2;1,7;1,k;1,8;1,s;1,1;1,3;1,4;1,8;1,1;1,2;1,9;1,4;1,4;1,8;1,c;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,z;1,1;1,3;1,3;1,1;1,2;1,6;1,1;1,2;1v,2d3;1,1;1,2;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;7,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;7,4;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,-2g6;1,1;1,3;1,1;1,2;1,1;1,3;1,2;1,2;1,3;1,5;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,4;1,h;1,z;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,l;1,7;1,k;1,10;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,2;1,5;1,1;1,7;1,c;1,8;1,k;1,8;1,4;1,4;1,8;1,1;1,w;1,7;1,1;1,3;1,4;1,8;1,1;1,4;1,7;1,k;1,1;1,z;1,s;1,s;1,g;1,3;1,2;1,z;1,1;1,3;1,4;1,8;1,1;1,4;1,1;1,5;1,1;1,1;1,3;1,2;1,2;1,8;1,1;1,2;1v,1z6;1,1;1,1;1,2;1,1;1,1;1,1;1,2;1,1;1,3;1,2;1,2;1,1;1,1;1,2;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;7,1;1,1;1,1;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;7,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,-226;1,1;1,1;1,6;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,4;1,2;1,2;1,8;1,5;1,z;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,4;1,g;1,8;1,4;1,h;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,4;1,4;1,d;1,z;1,4;1,4;1,8;1,1;1,2;1,2;1,7;1,g;1,c;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,k;1,8;1,4;1,o;1,4;1,4;1,8;1,1;1,2;1,2;1,7;1,4;1,4;1,8;1,5;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1v,1o6;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;7,2;1,1;1,1;1,1;1,2;1,1;1,2;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;7,1;1,1;1,2;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,-1q4;1,1;1,3;1,3;1,1;1,1;1,7;1,1;1,2;1,2;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,k;1,z;1,1;1,3;1,3;1,1;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,4;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,s;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,3;1,4;1,8;1,5;1,7;1,l;1,7;1,8;1,k;1,s;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,4;1,4;1,d;1,7;1,l;1,7;1,1;1,3;1,4;1v,1cp;1,1;1,1;1,3;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;7,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,2;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,2;1,5;1,1;1,1;1,1;1,1;7,1;1,3;1,2;1,2;1,1;1,1;1,2;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,3;1,1;1,-1fr;1,1;1,2;1,2;1,7;1,4;1,4;1,8;1,c;1,1;1,3;1,4;1,8;1,1;1,4;1,z;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,3;1,4;1,1;1,7;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,l;1,z;1,1;1,3;1,4;1,2;1,6;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,4;1,g;1,8;1,4;1,o;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,5;1,2;1,4;1,o;1,s;1,4;1,f;1,2;1,7;1,s;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,k;1v,10x;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,3;1,2;1,2;1,1;1,1;1,1;1,1;1,1;27,-11b;1,s;1,1;1,3;1,4;1,8;1,1;1,4;1,7;1,4;1,4;1,8;1,5;1,7;1,1;1,3;1,3;1,1;1,2;1,6;1,1;1,2;1,9;1,4;1,4;1,8;1,1;1,b;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,1;1,2;1,4;1,2;1,6;1,1;1,2;1,1;1,1;1,4;1,3;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,1j;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,4;1,4;1,8;1,1;1,3;1,1;1,7;1,8;1,9;1,2;1,9;1,1;1,3;1,4;1,8;1,1;1,2;1,2;4j,7;1,l;1,z;1,4;1,o;1,4;1,4;1,9;1,2;1,9;1,1;1,3;1,3;1,1;1,2;1,6;1,1;1,2;1,2;1,7;1,l;1,z;1,4;1,4;1,8;1,3;1,9;1,4;1,4;1,8;1,3;1,2;1,7;1,4;1,4;1,8;1,1;1,2;1,11;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,3;1,4;1,5;1,3;1,1;1,2;1,2;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,l;1,z;1,1;1,3;1,4;1,2;1,6;1,1;1,2;1,2;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,1;1,1;1,7;1,4;4j,4;1,9;1,b;1,1;1,3;1,4;1,5;1,3;1,1;1,2;1,2;1,4;1,3;1,1;1,3;1,4;1,b;1,2;1,7;1,1;1,3;1,f;1,2;1,7;1,1;1,3;1,4;1,9;1,2;1,2;1,7;1,4;1,4;1,9;1,2;1,9;1,1;1,3;1,4;1,5;1,3;1,3;1,2;1,7;1,4;1,4;1,8;1,5;1,7;1,1;1,3;1,4;1,d;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;1,7;1,1;1,3;1,4;1,8;1,3;1,2;1,7;1,1;1,3;1,2;1,1;1,1;1,1;1,7;1,1;1,2;1,2;1,4;1,3;1,4;1,4;1,8;1,1;1,4;1,7;1,1;1,3;1,4;1,8;1,1;1,2;1,2;bn,-qxs;1,1i;1,5w;1,4y;1,br;1,9b;1,3q;1,34;1,84;1,xk;1,6t;1,24x;1,8f;1,1;1,1k;1,nx;1,1o6;1,e8;1,vu;1,1pb;1,15;1,11v;1,1d;1,by;1,ia;1,7b;1,8c;1,6j;1,1yn;1,-e56;1,8p;1,40;1,2g6;1,6y;1,21k;1,1lf;1,2mj;1,1pc;1,o;1,2c1;1,-duo;1,hz;1,1bo;1,56;1,32;1,wc;1,7;1,ni;1,e1;1,p2;1,4m;1,43;1,1eg;1,1br;1,59;1,dm;1,7n;1,6v;1,82;1,vw;1,cx;1,3;1,1oa;1,23s;1,-e20;1,1f6;1,3fe;1,1fh;1,227;1,ga;1,1v2;1,xh;1,-ci;1,38a;1,-dlc;1,vq;1,64;1,10i;1,r7;1,4f;1,2r;1,n5;1,hb;1,hf;1,rb;1,1dp;1,4b;1,8g;1,5p;1,13e;1,3ud;1,pu;1,1;1,283;4j,-f3m;1,1vt;1,4ue;1,2ax;1,3fp;1,ns;1,-da5;1,14d;1,d0;1,jp;1,3a;1,bk;1,3n;1,g;1,fh;1,25k;1,1sr;1,c;1,1ga;1,43;1,1q;1,d7;1,co;1,5p;1,og;1,q8;1,d6;1,1k1;1,nl;1,16i;1,-fb0;1,18;1,7o;1,di;1,19a;1,1rc;1,7;1,16;1,r5;1,xd;1,10n;1,1as;1,69;1,28;1,xd;1,1em;1,fa;1,myd;1,-k0p;1,dg;1,-cnf;1,17m;1,-up;1,vxs;1,-ojy;1,li;1,3jw;1,-cy5;1,pf;1,1oq;1,bn;1,yy;1,4c;1,a4;1,d;1,1tl;1,i4;1,1pr;1,41u;1,1t;1,l44;1,-kn9;1,co;1,4z;1,-diy;1,3c;1,a7;1,2op;1,70;1,ek;1,1n5;1,4re;1,yr;1,1kj;1,10u;1,1bq;1,-ez1;1,fn;1,4in;1,5s;1,-4l3;1,as;1,5;1,4r4;4j,2l6;1,578;1,2is;1,-f1l;1,2o4;1,9fn;1,-ckq;1,3fl;1,g4;1,65;1,oi;1,g8;1,118;1,3ig;1,1ll;1,2k3;1,-ccv;1,588;1,1b;1,go;1,1o5;1,6s;1,fw;1,1r6;1,dl;1,z3;1,2jy;1,-bm0;1,1yp;1,ka;1,2rg;1,dm;1,25l;1,-b6v;1,34e;1,577;1,324;1,1fi;1,8l;1,-dls;1,87;1,23;1,4g;1,20;1,cb;1,c;1,4y;1,s1;1,7n;1,17b;1,6v;1,dh;1,1i;1,ma;1,4e;1,77;1,24;1,1l;1,bn;1,z4;1,la;1,30;1,q6;1,6;1,11;1,7j;1,ib;1,3k;1,dv;1,n;1,gf;1,26;1,hu;1,16;1,64;1,hn;1,1jk;1,q7;1,74;1,r0;1,te;1,1h;1,f6;1,b2;1,-f1i;1,13l;1,kn;1,7r;1,eq;1,6b;1,vm;1,9m;1,180;1,32;4j,1k;1,14y;1,1b6;1,8c;1,gm;1,a7;1,ji;1,a8;1,h;1,2a4;1,49;1,bi;1,21b;1,1fa;1,-elc;1,5;1,2p;1,13;1,i1;1,k7;1,b7;1,5z;1,hc;1,uk;1,g0;1,e;1,19;1,8e;1,7j;1,eq;1,l8;1,1tr;1,44;1,6m;1,jl;1,11x;1,33;1,4e;1,6m;1,9j;1,n;1,6r;1,cx;1,hc;1,3n;1,dt;1,lsu;1,-ktj;1,pe;1,pl;1,bk;1,hd;1,u3;1,-ena;1,3am;1,9j;1,bh;1,3ht;1,3jr;1,3e1;1,-dww;1,38;1,14d;1,1rp;1,iz;1,s;1,181;1,10q;1,41i;1,3t2;1,-9do;1,rrw;1,-in0;1,-etp;1,cx;1,5;1,8e;1,1px;1,i9;1,h7;1,t;1,hw;1,52;1,b8;1,2vy;1,1b5;1,2eh;1,16n;1,25p;1,-ehp;1,2pb;1,17r;1,13o;1,2m8;4j,z9;1,1z6;1,1bo;1,17;1,mu;1,h2;1,l9;1,zf;1,-bcj;1,26t;1,5jr;1,25q;1,kk8;1,-x2d;1,1yw;1,2c;1,12v;1,1hz;1,g4;1,zy;1,rn;1,4p;1,1c9;1,q7;1,vp;1,16j;1,kr;1,1td;1,ng;1,-e0q;1,2sv;1,i7;1,8wm;1,-cqg;1,cf;1,d4;1,14o;1,16y;1,1kt;1,194;1,o2;1,fc;1,7o;1,1h6;1,141;1,3u2;1,-ctx;1,379;1,5hs;1,-9p1;1,fe;1,1je;1,44;1,1fw;1,71;1,bt;1,1ds;1,9rl;1,-cky;1,6mh;1,pl;1,2we;1,-csb;1,fh;1,rf;1,74;1,128;1,ic;1,1z;1,1fn;1,10;1,k3;1,fe;1,1p2;1,q5;1,9t;1,12n;1,ij;1,br;1,q6;1,b5;1,1lw;1,23;1,ak;1,1mh;1,9e;1,9i;1,-fbn;1,19;1,o;1,2y;1,8a;1,au;1,av;4j,1u;1,4j;1,2;1,4p;1,au;1,9t;1,19;1,th;1,cg;1,95;1,mk;1,64;1,hl;1,h3;1,1d;1,de;1,at;1,3a;1,12;1,2e;1,gr;1,d7;1,gv;1,5b;1,31;1,qk;1,16;1,i5;1,ll;1,i2;1,dv;1,9;1,5;1,5x;1,137;1,k1;1,cp;1,ck;1,9d;1,4g;1,c3;1,2a;1,1ek;1,37;1,is;1,6m;1,cl;1,-ec1;1,111;1,7t6;1,3x2;1,b;1,1e1;1,-eqh;1,7lp;1,zw;1,1th;1,16c;1,es;1,-b8h;1,ug;1,1g0;1,4jr;1,-641;1,o5;1,5eu;1,1h;1,1k0;1,2e6;1,-ccm;1,eq;1,5c;1,3j;1,pd;1,2cr;1,3j;1,1i0;1,jd;1,1v8;1,-70y;1,69e;1,3kh;1,1se;1,1gf;1,-97f;1,p5;1,x9;1,5bx;1,v3;1,22n;1,iwr;1,-sy7;1,zl;1,6kc;4j,2vc;1,iiz;1,-wm4;1,n6;1,f5;1,22g;1,185;1,1yn;1,uz;1,hh;1,b;1,ft;1,1h3;1,10a;1,ro;1,jm;1,12r;1,-d65;1,uk;1,5xc;1,17d;1,1nw;1,2tu;1,kbu;1,-s6o;1,-4y5;1,74;1,1o;1,32w;1,1bt;1,4d;1,8x0;1,-dsk;1,db;1,1s;1,2xr;1,rl;1,id;1,cm;1,22n;1,1cd;1,1gu;1,8i;1,153;1,av;1,wo;1,1vc;1,iww;1,-xmn;1,24t;1,27v;1,8v;1,vx;1,1wm;1,11p;1,1o;1,1rg;1,15h;1,1;1,68;1,m23;1,-k4k;1,-dgb;1,xr;1,2fv;1,gc;1,1z5;1,3ag;1,24;1,-98u;1,ju;1,7lm;1,1qr;1,-9ta;1,d;1,h4;1,a;1,v0;1,3w;1,5v;1,5b;1,2;1,7s;1,1f;1,24;1,fl;1,5o;1,3i;1,6b;1,3x;1,9a;1,j8;1,nr;1,c;4j,8r;1,1;1,1r;1,a5;1,-7;1,bf;1,63;1,6h;1,2i;1,5;1,91;1,15d;1,3y;1,4;1,2g;1,x;1,5x;1,7;1,le;1,32;1,2a;1,6;1,1;1,1e;1,ez;1,a3;1,56;1,cu;1,3i;1,13;1,2n;1,1vw;1,8n;1,6x;1,8f;1,14a;1,3;1,14u;1,33;1,59;1,1;1,2e;1,tp;1,-6h4;1,-95g;1,wj;1,2xx;1,12e;1,871;1,-bvq;1,-vl;1,x5d;1,1;1,-ve8;1,1je;1,tuv;1,-toe;1,1c;1,tn3;1,1;1,1;1,1;1,1;1,1;1,-kmo;1,kmp;1,1;1,1;1,1;1,1;1,-lqy;1,lqz;1,1;1,1;1,1;1,-sxy;1,sxz;1,-qtj;1,qtk;1,1;1,-jek;1,jel;1,-tld;1,17;1,-36r;1,wqy;1,-sr6;1,cx;1,103;1,re7;1,-q23;1,q24;1,1;1,1;4j,-oig;1,oih;1,1;1,-m9h;1,-9t4;1,ni;1,vf4;1,1;1,1;1,1;1,1;1,-xrd;1,xre;1,-x52;1,1k1;1,2w8;1,4rk;1,nxa;1,-vjv;1,zl;1,17q;1,46o;1,-53p;1,3b;1,gs;1,4z;1,-1hw;1,-g;1,-1t9;1,ww5;1,-vjv;1,14l;1,6h;1,u8u;1,1;1,1;1,-q8p;1,q8q;1,1;1,1;1,1;1,1;1,1;1,-iuf;1,iug;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-r5s;1,r5t;1,1;1,-nly;1,2r7;1,-98h;1,u39;1,1;1,-noh;1,noi;1,1;1,-v0q;1,v0r;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-vag;1,9bw;1,-6ui;1,49h;1,ojm;1,1;1,1;1,1;1,1;1,1;1,-nru;1,nrv;1,1;1,-v19;1,3ah;1,-52e;1,5ff;1,-49s;1,8bg;4j,-agt;1,3h;1,40;1,19k;1,a2;1,bz;1,1an;1,19d;1,1b;1,wq;1,8l;1,ig;1,1wg;1,le;1,8f;1,cg;1,1rh;1,cn;1,1pc;1,fd;1,-97k;1,26b;1,qk;1,fy;1,598;1,-bni;1,dz;1,225;1,m2;1,dv;1,1ei;1,3e;1,7m;1,24;1,187;1,21f;1,ai;1,p0;1,ua;1,90;1,43;1,1j9;1,-7m4;1,1q8;1,16p;1,3p7;1,ge;1,-bpp;1,ky;1,2e;1,16y;1,px;1,if;1,ua;1,2hi;1,1gg;1,259;1,4l1;1,-ft1;1,1ph;1,-q;1,c9;1,km;1,4k;1,at;1,9b;1,j3;1,j1;1,2xe;1,2tj;1,1ap;1,tp;1,1xu;1,1n5;1,-dau;1,tu;1,70;1,-3a9;1,dq;1,1c;1,yu;1,7z;1,y;1,qf;1,2a;1,46;1,45;1,7v;1,6k;1,8a;1,gl;1,3c;1,3y;1,to;4j,52;1,cp;1,ly;1,21;1,4z;1,7k;1,ey;1,ym;1,4d;1,fs;1,3u;1,1xl;1,145;1,n8;1,7a;1,2d;1,cb;1,h;1,1r;1,4q;1,gg;1,mh;1,9y;1,-8p6;1,tw;1,gi;1,22;1,5i;1,sb;1,gs;1,f9;1,jb;1,2jp;1,-a1j;1,1lq;1,wv;1,47;1,5d;1,15a;1,wi;1,4r;1,58x;1,2bd;1,-ejq;1,8pg;1,-8mc;1,jz;1,x;1,7c;1,8n;1,2or;1,156;1,67;1,3z;1,u7;1,gu;1,18g;1,dz;1,mq;1,173;1,of;1,2si;1,-cvd;1,3zv;1,cl;1,1j;1,2th;1,z3;1,1po;1,naf;1,-ljo;1,r5;1,1li;1,-bsu;1,7dd;1,62;1,2p3;1,1a;1,bi;1,-9yu;1,-e2;1,2ik;1,1gv;1,xf;1,y6;1,23f;1,10g;1,17n;1,1s9;1,-dk9;1,2gf;1,twl;1,-pv6;1,1ss;4j,1bu;1,aj;1,8u;1,1hz;1,kp9;1,-rpd;1,qm;1,lh;1,1vn;1,1cs;1,n4w;1,-kj7;1,1on;1,iul;1,-xr0;1,z7;1,4nj;1,e;1,10s;1,d9;1,3yq;1,4q9;1,-ez6;1,c47;1,-9xv;1,1hx;1,1z;1,162;1,yd;1,2fs;1,gp;1,1f5;1,pj;1,2h;1,-7p0;1,64v;1,18n;1,-85x;1,1n1;1,18z;1,13m;1,7d;1,2y;1,3rn;1,1uk;1,-cwo;1,2o7;1,ib;1,76y;1,-9xv;1,3jd;1,3id;1,-7nb;1,9k;1,9v;1,2o;1,4hk;1,b4;1,3od;1,3;1,1i;1,13c;1,1nn;1,uh;1,j8;1,-d21;1,ap;1,ce;1,99;1,23u;1,hu;1,5s;1,p3;1,105;1,10k;1,1t8;1,2ia;1,g7;1,2oa;1,xh;1,8;1,tp;1,1j;1,-f1v;1,3zf;1,xd;1,x2;1,1se;1,4dz;1,1k0;1,-alu;1,34;1,mb;1,1z4;4j,fa;1,n4;1,1uz;1,hn;1,vz;1,20o;1,71;1,mf;1,-cy5;1,2i;1,3w;1,57t;1,qk;1,4qi;1,-8ah;1,1bt;1,17w;1,t0;1,2gs;1,-1qh;1,-781;1,2a;1,1j7;1,w2u;1,-uxx;1,74;1,gy;1,3va;1,1h7;1,vh;1,1g;1,3c;1,34o;1,eu;1,xu;1,2a;1,5s;1,1ft;1,-frq;1,6cc;1,1zb;1,4qu;1,zn;1,-deh;1,ww2;1,-teg;1,1o;1,173;1,wb;1,56;1,e0;1,yf;1,1sq;1,16t;1,2e;1,1hv;1,7q;1,1m5;1,u5;1,i3;1,3f;1,-7hl;1,6r;1,td;1,17t;1,30b;1,29n;1,k;1,-3wd;1,-9vb;1,17p;1,1lv;1,1s0;1,x4;1,1ht;1,ta;1,-9ct;1,64n;1,fu;1,19k;1,3y0;1,o;1,q;1,1z7;1,-eb5;1,gk;1,26s;1,ko;1,1c3;1,2et;1,vo;1,a3;1,1p9;1,xe;4j,29s;1,23v;1,va;1,-dyt;1,a1;1,f5;1,2pd;1,qv;1,8l;1,1f0;1,1dg;1,7c;1,1d3;1,t6;1,23w;1,h3;1,-ddu;1,3t5;1,f5;1,ch;1,p9;1,9n;1,ab;1,sa;1,2f;1,6x;1,5n;1,g7;1,3pd;1,2lu;1,-e0h;1,3b5;1,abu;1,-e02;1,45;1,2jy;1,3bl;1,34e;1,3g2;1,-9en;1,c9;1,1cj;1,sp6;1,-jiz;1,-ddg;1,915;1,-97z;1,-g;1,4nm;1,3b2;1,pu;1,183;1,3no;1,-dy3;1,gf;1,a7;1,3b;1,73;1,1g7;1,ua;1,1bb;1,9m;1,xw;1,105;1,3b;1,7i;1,3h;1,q8v;1,-pz4;1,1ai;1,lp;1,1r;1,r5;1,11i;1,i;1,1rf;1,4;1,102;1,yv;1,-e5o;1,5ep;1,gi;1,js;1,3fm;1,1ps;1,1kp;1,14k;1,g8;1,-avc;1,184;1,19k;1,2ph;1,46m;1,-63u;4j,in;1,2d;1,aa;1,-4rt;1,35t;1,aw;1,ju;1,18;1,6h0;1,bs;1,o7;1,-d7h;1,hj;1,3bf;1,3ng;1,en;1,2jh;1,-d4x;1,11i;1,1cs;1,q1;1,ak;1,es;1,d7;1,mk;1,43;1,1kz;1,18;1,8o;1,1ff;1,2ha;1,6f;1,mg;1,1co;1,20i;1,l2;1,-e1r;1,2ot;1,vm;1,134;1,4f2;1,19d;1,2s0;1,-ee1;1,25f;1,190;1,1;1,1fm;1,4gn;1,bm;1,n2;1,49;1,42;1,28x;1,aj;1,-b7y;1,dq;1,61;1,8u;1,21j;1,ab;1,6j;1,ne;1,13p;1,2s1;1,2ma;1,18;1,pq;1,24k;1,-56l;1,29u;1,1xe;1,s4;1,v9;1,-dae;1,3as;1,1e0;1,rb;1,-j;1,2lp;1,-9ya;1,b1l;1,-b46;1,20;1,8k;1,4cg;1,qz;1,228;1,s;1,1b3;1,19;1,512;1,1g3;1,-9gw;4j,4ek;1,-a5o;1,h4;1,34;1,3gx;1,3z;1,i2;1,12w;1,1ls;1,5u;1,29y;1,bv;1,kd;1,1xm;1,8f;1,21o;1,-41e;1,-b84;1,dg;1,99;1,1d3;1,vr;1,m0;1,mb;1,1;1,fp;1,82;1,gh;1,bw;1,e;1,1ac;1,2;1,dc;1,l3;1,4j;1,1mk;1,it;1,21;1,1kr;1,14;1,9w;1,-7dw;1,12g;1,15j;1,w7;1,3c;1,kg;1,6zn;1,-9wq;1,7n;1,-3u8;1,2ro;1,5tf;1,-9pm;1,10k;1,7a;1,11i;1,z4;1,h1;1,8v;1,1c7;1,z5;1,1ik;1,1kw;1,381;1,-cpb;1,26q;1,qr;1,t;1,1r;1,59;1,dg;1,8l;1,op;1,el;1,2t;1,11y;1,k6;1,9y;1,1rd;1,rc;1,6c;1,h4;1,115;1,f0;1,220;1,18a;1,-dkp;1,dv4;1,-fk7;1,e5;1,fh;1,7o;1,37c;4j,1db;1,39w;1,1;1,nn;1,17w;1,2ye;1,a7;1,-df4;1,51y;1,15g;1,-5x2;1,17r;1,bo;1,7h;1,e9;1,2q;1,1h8;1,b0;1,4t;1,yh;1,8;1,1qd;1,12i;1,m3;1,16h;1,13b;1,yx;1,1gq;1,1hv;1,-d31;1,sf;1,2f;1,4e;1,pw;1,4s;1,1;1,179;1,66;1,1bk;1,16;1,1zs;1,4oj;1,-bf2;1,8k6;1,s4;1,-b77;1,71;1,31v;1,8y;1,4j;1,hu;1,lg;1,ia;1,1di;1,66;1,1di;1,75;1,au;1,of;1,4s;1,ni;1,21z;1,1e6;1,js;1,-eq5;1,t2;1,3n;1,e;1,2y9;1,9s;1,5w;1,41;1,tu;1,mj;1,h6;1,wl;1,9z;1,5q;1,5e;1,o;1,d0;1,17;1,1d;1,t6;1,yu;1,14k;1,1kk;1,1mm;1,65;1,-dv0;1,369;1,cx;1,1vj;1,8d;4j,1ez;1,4lr;1,rq;1,4x;1,1os;1,2d;1,-eu8;1,2y;1,1bx;1,gu;1,hs;1,f3;1,8g;1,js;1,lb;1,3f;1,8;1,20;1,aq;1,ep;1,10m;1,1z7;1,v0;1,p5;1,5y;1,4r;1,3s;1,dq;1,dn;1,pq;1,6l;1,13j;1,13g;1,1um;1,-fpf;1,-q;1,xgw;1,-vvu;1,1i7;1,n8;1,52;1,rh;1,1ck;1,k6;1,14a;1,1zd;1,e;1,1lm;1,1;1,10;1,qv;1,g9;1,f8;1,10d;1,-e2j;1,1t;1,2wb;1,1x0;1,2b;1,2u3;1,1;1,79i;1,-c0z;1,2ax;1,1gf;1,2z;1,pi;1,q2i;1,-obn;1,1du;1,4m;1,3qr;1,-eks;1,8qn;1,td;1,4dx;1,-ddw;1,2ed;1,23z;1,p5;1,g;1,3x;1,15g;1,1sl;1,1fj;1,-4dq;1,1gl;1,-6yn;1,b1;1,189;1,2dz;1,14v;1,1zk;1,bz;4j,gh;1,2nk;1,34b;1,9j;1,je4;1,-wsn;1,2ar;1,8sp;1,ta;1,7;1,63;1,-cbp;1,7eo;1,78k;1,jj;1,-fzj;1,dl;1,ab;1,25i;1,f0;1,1if;1,s;1,ay;1,75;1,1ke;1,um;1,5g;1,sk;1,7o;1,40a;1,1yx;1,6g;1,-enf;1,1ms;1,g;1,qt;1,22g;1,zb;1,bw;1,a1;1,77;1,vb;1,93;1,2wu;1,z7;1,1j;1,g9;1,qg;1,-cn9;1,cm;1,fv;1,24;1,1mf;1,t2;1,1gk;1,3nm;1,1ka;1,c6;1,dh;1,s3;1,3j;1,14j;1,2;1,222;1,h9;1,-ag6;1,-4vq;1,aq;1,1u9;1,jc;1,6m;1,1;1,19z;1,12j;1,1m3;1,4l;1,i1;1,1z4;1,1c1;1,eu;1,1sw;1,j4;1,201;1,-fl2;1,5n;1,7r;1,46;1,cx;1,p;1,c7;1,2y;1,nk;1,97;1,8r;4j,6s;1,r;1,2f;1,k0;1,ukq;1,-ttc;1,ld;1,1c;1,1jb;1,8n;1,pd;1,1rk;1,7t;1,l3;1,ey;1,1;1,21;1,4m;1,2h;1,7k;1,196;1,il;1,1y;1,l;1,3d;1,1y;1,mm;1,6s;1,u8;1,14;1,ph;1,lq;1,-ekw;1,-7l;1,f7;1,gb;1,fz;1,4h;1,q;1,1ap;1,bp;1,5m;1,pu;1,19q;1,ws;1,14c;1,14z;1,2d;1,1p;1,13l;1,1zp;1,20f;1,jg7;1,-xl8;1,33w;1,2w;1,n7;1,-13t;1,1ya;1,cv;1,336;1,153;1,65l;1,-fo7;1,hw;1,ho;1,l;1,13;1,182;1,67;1,th;1,ff;1,60;1,5b;1,1c;1,lz;1,dz;1,f4;1,fh;1,2;1,1;1,1;1,68;1,rsg;1,-qb7;1,cl;1,ew;1,3j;1,90;1,3;1,iz;1,94;1,eu;1,5g;4j,49;1,3o;1,fk;1,mg;1,cu;1,cx;1,4z;1,9b;1,v2;1,18l;1,al;1,19c;1,-ebz;1,vy;1,ua;1,17k;1,10n;1,70;1,bx;1,id;1,10;1,g8;1,9c;1,4xm;1,18;1,294;1,-asq;1,23q;1,3z5;1,52h;1,-eyc;1,1q;1,g;1,1m;1,2t;1,2;1,1v;1,2o;1,80;1,kz;1,6;1,7i;1,65;1,6w;1,eo;1,3b;1,4v;1,d6;1,f;1,a;1,dr;1,1k;1,a6;1,3o;1,nf;1,fo;1,j;1,g7;1,5;1,4y;1,jy;1,7y;1,1q;1,98;1,di;1,n0;1,xp;1,8s;1,2;1,w;1,2p;1,fc;1,8e;1,2j;1,lw;1,av;1,ap;1,8z;1,dy;1,ew;1,a9;1,e;1,5b;1,cf;1,3u;1,g7;1,71;1,1n6;1,6b;1,xq;1,-f2r;1,x0f;1,-swl;1,swm;4j,-xci;1,b6;1,213;1,1rm;1,1de;1,1h1;1,9l;1,3e;1,16i;1,1s5;1,2jg;1,14o;1,-ed5;1,4d7;1,1ew;1,144;1,40b;1,-azk;1,xuq;1,-sv6;1,bp;1,10p;1,420;1,hl;1,nn;1,-778;1,2a2;1,6tt;1,1b1;1,-eqt;1,j1;1,o;1,28;1,tj;1,2s;1,31;1,10p;1,61;1,5j;1,9k;1,2a;1,m;1,y;1,fl;1,1ge;1,eo;1,s7;1,rp;1,3;1,3k;1,u0;1,h9;1,gc;1,tf;1,1sv;1,75;1,3j;1,dq;1,3h;1,20u;1,-ce6;1,5lr;1,4sg;1,-awm;1,wbp;1,-p3f;1,jl;1,11s;1,-35s;1,j1;1,6;1,q4o;1,-oyc;1,-6tw;1,3a;1,xt;1,5v;1,13;1,62;1,5h;1,fx;1,6l;1,cu;1,90;1,20;1,v;1,7y;1,64;1,1vy;1,da;1,1e8;1,e8;1,2w;1,bg;4j,ab;1,8d;1,pp;1,r4;1,7o;1,13e;1,jr;1,2cp;1,2b;1,-du3;1,2g;1,xs;1,j3;1,114;1,2n;1,7x;1,xs;1,ad;1,be;1,1p0;1,52;1,2e5;1,2kl;1,9s;1,-dhu;1,dt;1,3i;1,u4;1,13b;1,48;1,1b8;1,mv;1,25;1,1nr;1,nf;1,hw;1,1v;1,1v;1,1k;1,bx;1,n2;1,ts;1,3f;1,9f;1,cy;1,1l;1,3q;1,rl;1,cy;1,i1;1,oe;1,id;1,ex;1,b8;1,10o;1,gx;1,-e9y;1,1rd;1,2kj;1,og;1,2t;1,76;1,3xd;1,pb;1,ps;1,6q;1,3h;1,2f4;1,1od;1,-f7q;1,40o;1,zd;1,3qc;1,1uw;1,zz;1,1o6;1,62;1,-9q8;1,1nw;1,v9;1,qrk;1,-vxc;1,ed;1,d5;1,vv;1,5v;1,7q;1,sv;1,1s;1,2iy;1,5s;1,ki;1,12;1,vf;4j,yy;1,s;1,6r;1,1tn;1,1de;1,-dbw;1,y4;1,4uo;1,bp;1,2jy;1,8k;1,dz;1,ojj;1,-lhb;1,-b7o;1,g3;1,f6;1,o4;1,2i;1,2;1,cx;1,v2;1,8z;1,41;1,ex;1,hy;1,sp;1,5o;1,87;1,a8;1,3p;1,8e;1,no;1,2x;1,-1;1,3v;1,zc;1,5r;1,23;1,6t;1,p;1,1kj;1,1t;1,4a;1,tp;1,15l;1,2c;1,2c;1,ea;1,11b;1,g1;1,-eow;1,2hh;1,25v;1,182;1,2z2;1,dp;1,2h6;1,e8;1,ll;1,-aes;1,ia;1,174;1,6gj;1,2ak;1,1ol;1,-7dm;1,-4qk;1,zz;1,1d0;1,19c;1,5kx;1,3r;1,123;1,1l7;1,-dsl;1,x15;1,-r33;1,1ml;1,5c8;1,-27a;1,1uv;1,-d0p;1,rt;1,fa;1,65;1,4o;1,aj;1,cl;1,5i;1,83;1,l;1,9x;1,kc;4j,7g;1,1q;1,8t;1,44;1,7u;1,1u;1,xt;1,9d;1,4q;1,6d;1,ew;1,ja;1,76;1,3z;1,3z;1,4r;1,ac;1,8r;1,gv;1,47;1,43;1,cv;1,5y;1,t;1,51;1,8t;1,az;1,eg;1,9r;1,22;1,7k;1,j0;1,ey;1,68;1,q0;1,7e;1,1t;1,6h;1,8a;1,z;1,r6;1,s;1,1;1,1a;1,16;1,7c;1,b2;1,8t;1,1z;1,-e2u;1,x6;1,4b;1,gn;1,27;1,3ki;1,ax;1,g5;1,hu;1,48;1,2bw;1,oo;1,-7j0;1,bq;1,z;1,48;1,14a;1,fa;1,9p;1,6c;1,8m;1,bw;1,5a;1,168;1,m3;1,4u;1,pt;1,cn;1,sv;1,6x;1,84;1,c4;1,33;1,zj;1,2q;1,1c3;1,bb;1,yw;1,by;1,-azs;1,7k7;1,1i5;1,hh;1,-aji;1,w;4j,1u;1,4ja;1,2m6;1,157;1,-4nn;1,-2jb;1,5p0;1,1us;1,1o;1,-bpw;1,1m;1,i7;1,dy;1,2y;1,308;1,p4;1,4te;1,1wc;1,2u1;1,-dzl;1,p8;1,m5;1,ph;1,61;1,b8;1,m;1,-1;1,c5;1,7j;1,8i;1,12y;1,36;1,j;1,ak;1,1i;1,27c;1,xy;1,9k;1,1aj;1,y7;1,1l;1,y1;1,5s;1,3;1,3c;1,ac;1,11;1,-adi;1,rk;1,mz;1,9s;1,hq;1,17k;1,i1;1,jq;1,mg;1,21a;1,29v;1,sj;1,py;1,1y9;1,v;1,-ekm;1,21;1,2o;1,wq;1,145;1,bc;1,138;1,vo;1,54;1,2ac;1,mv;1,tn;1,r9;1,t7;1,45;1,c5;1,eq;1,10;1,8l;1,lj;1,wx;1,6o;1,kwm;1,-kvg;1,-as4;1,hf;1,1u;1,wz;1,-ww;1,y;1,qg;1,2im;4j,ru9;1,-rk1;1,ey;1,zz;1,2ol;1,1mv;1,-bw6;1,w1;1,wtu;1,-jh6;1,-8ga;1,-5td;1,86;1,b2;1,ss;1,xz;1,jn;1,10p;1,37s;1,38k;1,6l;1,no;1,9n;1,ck;1,2ea;1,3q;1,ge;1,s6;1,2c;1,-doz;1,x5;1,7e;1,3r;1,il;1,1g;1,jw;1,17l;1,tf;1,6vx;1,gi;1,ze;1,qq;1,o7;1,-df2;1,8f;1,18x;1,na;1,e1;1,2yc;1,685;1,5o;1,5j;1,nf;1,-any;1,7ds;1,qy;1,1dd;1,-cqv;1,1h0;1,8d;1,67;1,1k2;1,33p;1,2p4;1,3ir;1,-c1g;1,1yh;1,36a;1,8d6;1,-fg8;1,20u;1,1cx;1,17w;1,11k;1,2uc;1,6yn;1,-ej7;1,8d;1,lf;1,11v;1,sl;1,14r;1,1cp;1,25a;1,1yp;1,3yy;1,4s;1,-dds;1,2yg;1,7u;1,1zw;1,388;1,n5;1,4jm;4j,-8ya;1,40h;1,603;1,2z;1,-fqz;1,d8;1,aj;1,1gm;1,1jx;1,l9;1,116;1,1sa;1,2rg;1,ny6;1,-kh2;1,-9zx;1,uh0;1,1;1,-oky;1,15t;1,ay;1,24;1,8a;1,1pk;1,l4a;1,-xl4;1,xl5;1,1;1,-vpx;1,gv;1,106;1,ox;1,8u;1,2d;1,8b;1,t0i;1,-shc;1,61;1,ko;1,l2;1,a3;1,va;1,1n;1,py;1,59;1,p3f;1,-o35;1,o36;1,-m60;1,m61;1,-lpm;1,17x;1,xp;1,jk1;1,-j1w;1,-d1i;1,1p9;1,17f;1,1tx;1,1dr;1,py;1,3co;1,2z3;1,bx;1,sy;1,-fhk;1,3aq;1,63;1,1ks;1,4l5;1,-9s3;1,1kd;1,1fa;1,3hf;1,4xj;1,6y;1,-9dq;1,8ey;1,-aos;1,8y;1,12w;1,i8;1,21x;1,21c;1,-37z;1,2bn;1,-4pz;1,-la;1,5t;1,xly;1,1;1,1;1,-vlr;1,vls;4j,1;1,-s2s;1,72;1,rvr;1,-q8f;1,v5;1,pdb;1,-nlq;1,1q;1,6s;1,2di;1,u;1,kyx;1,-j1q;1,j1r;1,1;1,1;1,-xr7;1,xr8;1,-vxn;1,1i2;1,1ay;1,t4o;1,1;1,-q1t;1,1qm;1,2k6;1,lr2;1,-kuf;1,21h;1,-ddi;1,aq;1,cx;1,13;1,b9;1,v6i;1,-ujc;1,ujd;1,1;1,-tog;1,-l;1,tp2;1,-sic;1,ne;1,1k;1,5r;1,5;1,2q;1,7z;1,rcu;1,-r03;1,2f;1,z;1,qwq;1,-qts;1,i;1,qtb;1,-pj9;1,w;1,pie;1,-oww;1,ha;1,ofn;1,-odj;1,odk;1,-mdm;1,1aq;1,l2x;1,1;1,1;1,-ke7;1,ke8;1,-iat;1,iau;1,1;1,1;1,-u8p;1,2kg;1,roa;1,-qum;1,qun;1,1;1,-jqo;1,-d1g;1,ws5;1,1;1,1;1,-ssx;1,ssy;1,-r2v;1,4i;1,lc;1,2ti;1,2k;4j,nh0;1,-jqj;1,10q;1,pk;1,-b09;1,t0j;1,-que;1,3ns;1,n6n;1,1;1,-vvi;1,vvj;1,1;1,-usz;1,c9;1,ugr;1,-t58;1,32;1,kr;1,1h;1,i2;1,57;1,8z;1,7f;1,49;1,1t;1,k;1,81;1,3z;1,b5;1,qil;1,-qc2;1,qc3;1,-q8q;1,dw;1,p2;1,ud;1,obg;1,1;1,-ngf;1,1gv;1,12m;1,kwz;1,-k89;1,k8a;1,-jh5;1,jh6;1,1;1,-xv6;1,dk;1,xhn;1,-x4d;1,d5;1,3rm;1,12y;1,nx;1,n4;1,vp;1,kj;1,1n0;1,mn;1,11;1,mus;1,-maq;1,b3;1,7u;1,6m;1,ll8;1,-kck;1,kcl;1,-jhh;1,71;1,-eik;1,3d;1,58;1,6h;1,ie;1,6u;1,-b;1,br;1,i0;1,2g;1,4t;1,50;1,cp;1,xn;1,u8q;1,-u0f;1,p8;1,4p;1,2t;1,g3;1,qb;1,nt;4j,7w;1,65;1,bq;1,1m3;1,2a3;1,po;1,3gu;1,k5;1,-d6k;1,37c;1,1c1;1,1x;1,629;1,-70v;1,14q;1,ca;1,ui;1,q4;1,1kl;1,-afe;1,1hh;1,2d8;1,371;1,13;1,9n;1,1u9;1,3bo;1,188;1,hz;1,-8j2;1,1c0;1,14z;1,1;1,1ff;1,z8;1,4f;1,ir;1,-9g2;1,8z;1,f;1,2km;1,2n;1,v7;1,18m;1,2y;1,p;1,vf;1,11u;1,ea;1,8d;1,1p;1,g9;1,1pq;1,1ya;1,df;1,-9pd;1,-1gw;1,1a2;1,b3;1,yp;1,1ep;1,-6zi;1,1xy;1,3fr;1,2h0;1,-63c;1,uu;1,2p;1,47s;1,fe;1,q5n;1,1;1,-xcm;1,7o;1,186;1,72;1,2x;1,1w;1,ej;1,v6f;1,1;1,-uu3;1,111;1,8v;1,3h;1,2z;1,tds;1,-t0i;1,t0j;1,-sc7;1,sc8;1,-qtd;1,h1;1,qcd;4j,-p4p;1,13;1,pk;1,n;1,bm;1,a8;1,nrm;1,-mhf;1,b6;1,bj;1,115;1,ktm;1,-ksj;1,1qq;1,-b10;1,1x0;1,g2;1,3aj;1,26e;1,1ak;1,-cm8;1,64;1,6i;1,8g;1,zk;1,5e;1,mo;1,lb;1,i2;1,1n7;1,s7;1,63;1,27;1,ke;1,jy;1,5i;1,4;1,287;1,jp;1,b5;1,1tt;1,13e;1,22;1,k4m;1,-xti;1,5f;1,85;1,50;1,im;1,3;1,14;1,1hw;1,24;1,29;1,za;1,2w;1,vm;1,2g7;1,8s;1,4p;1,hu;1,i6;1,1t;1,14;1,nh;1,jb;1,jy;1,ne;1,3t;1,1us;1,3p;1,4u;1,6t;1,wr;1,2r;1,1;1,-dg3;1,2hd;1,1ae;1,1w;1,e6;1,1t9;1,1qy;1,4gb;1,1ft;1,-eih;1,xtg;1,-sc3;1,98;1,s2;1,e1;1,2vj;1,io;1,ij;4j,260;1,18q;1,2l;1,7d;1,-3q9;1,4d3;1,-f4x;1,6wq;1,7cq;1,-dq9;1,gs;1,8y;1,fm;1,-1;1,41;1,l4;1,15;1,73;1,v9;1,7r;1,j9;1,1ox;1,50;1,8p;1,u;1,ps;1,7j;1,7s;1,2uy;1,14g;1,1c4;1,7v;1,kti;1,-jms;1,dy;1,xv;1,-aoj;1,7lu;1,yc;1,-d8x;1,70;1,45;1,ib;1,po;1,jr;1,19;1,eg;1,12f;1,10g;1,1i5;1,sl;1,ex;1,1wk;1,k4;1,nf;1,2g;1,61;1,f4;1,70;1,59;1,dm;1,11v;1,1h2;1,p0;1,-f6k;1,7y;1,ap;1,2g;1,x99;1,-wig;1,3e;1,15d;1,17;1,k7;1,1;1,1t;1,de;1,1r;1,15;1,1;1,jf;1,ac;1,cx;1,szj;1,-stw;1,6;1,str;1,-siw;1,1;1,nr;1,32;1,rs3;1,-rki;1,rkj;4j,-r8q;1,np;1,1;1,ql1;1,-qcw;1,5x;1,q70;1,-pyz;1,pz0;1,1;1,-oiq;1,up;1,fu;1,wt;1,cj;1,1v;1,i;1,n7;1,i;1,eg;1,-c;1,1o;1,5r;1,3k;1,bp;1,k82;1,1;1,-vyg;1,vyh;1,-s1r;1,43a;1,15;1,nxd;1,1;1,-xar;1,1m2;1,jy;1,v4s;1,1;1,-rci;1,ub;1,2m5;1,2eb;1,lhs;1,-khs;1,oo;1,jt5;1,1;1,1;1,1;1,-nz0;1,-60h;1,2ry;1,2mk;1,205;1,mkv;1,-w1o;1,1qh;1,66;1,228;1,64n;1,1j6;1,tt;1,-eag;1,152;1,53g;1,4le;1,3er;1,ar;1,6z;1,-ahk;1,1sd;1,71q;1,-cdw;1,358;1,6b5;1,5kv;1,-fh8;1,3h;1,6e;1,23g;1,12r;1,6o;1,kt;1,t5;1,jk;1,1xo;1,gi;1,1ja;1,jf;1,mj;1,h8;1,2w;1,gp;4j,50;1,18b;1,-d9b;1,2h;1,11;1,xqr;1,1;1,-vqf;1,4x;1,vlj;1,-ust;1,89;1,1s;1,5i;1,udb;1,1;1,1;1,1;1,-qsl;1,br;1,qgv;1,-q5w;1,2l;1,q3c;1,-p9m;1,p9n;1,-o2i;1,13;1,29;1,gt;1,34;1,nfa;1,1;1,-lkb;1,-a;1,r8;1,kte;1,1;1,-j5i;1,o;1,j4v;1,1;1,-r79;1,1ar;1,1s0;1,2;1,1c;1,272;1,-bxc;1,7;1,n6;1,a5;1,wvx;1,-wmo;1,f7;1,m3;1,cq;1,nk;1,54;1,2w1;1,rk0;1,1;1,-olh;1,157;1,ngb;1,-msd;1,sa;1,m04;1,-jgk;1,a;1,jgb;1,1;1,-xyr;1,9m;1,10;1,1vf;1,2jw;1,1q5;1,6mu;1,oo;1,16x;1,-eri;1,1yp;1,4e;1,27;1,19k;1,ucz;1,1;1,-p9d;1,p9e;1,-nfr;1,1v8;1,-bq6;1,db;4j,wxf;1,1;1,1;1,-xt8;1,po;1,1rg;1,7sa;1,-a97;1,o6;1,ha;1,10h;1,1i;1,9d;1,7;1,5;1,zr;1,6d;1,2o3;1,cu;1,5x;1,ew;1,a9;1,5a;1,lo;1,ve;1,ka;1,dh;1,8u;1,dr;1,4y;1,10l;1,d5;1,1z9;1,-e40;1,pq;1,qq;1,2y7;1,3h;1,21g;1,1o;1,al;1,2a0;1,y8;1,2wv;1,12s;1,1bm;1,-d1d;1,2nq;1,j5;1,rm;1,1gk;1,-571;1,1zu;1,1ps;1,2ft;1,3a;1,2do;1,2w6;1,-edw;1,5r;1,uh;1,104;1,3r;1,1g;1,3h;1,ij;1,fg;1,29;1,4x;1,uv;1,me;1,4k;1,jt;1,3o;1,2x;1,tv;1,lj;1,qt0;1,-qlm;1,8r;1,191;1,cn;1,y9;1,2v;1,8;1,bn;1,6a;1,53;1,35;1,1n;1,lq;1,ty;1,wp;1,qz;4j,85;1,-dn3;1,n0;1,gv;1,w8;1,1b1;1,zn;1,6l;1,2e;1,14a;1,46;1,bu;1,2p0;1,23k;1,rk;1,h4;1,37m;1,3;1,-8wx;1,1uq;1,30e;1,1n1;1,-deb;1,7;1,dg;1,ni;1,11s;1,xx;1,tc;1,xs;1,e1;1,4p;1,if;1,a4;1,xr;1,29;1,ib;1,16j;1,al;1,14i;1,7m;1,2m;1,bk;1,v8;1,gk;1,d4;1,b6;1,4f;1,17a;1,1ox;1,-f3w;1,87;1,1cn;1,69;1,1p2;1,7x;1,1vj;1,r4;1,qpj;1,-pyv;1,qx;1,5q;1,8i;1,dt;1,bl;1,po;1,1io;1,bj;1,4a;1,3h;1,3i;1,az;1,f;1,34;1,o8;1,-dji;1,1j;1,8p;1,51;1,g;1,5x;1,t;1,16f;1,r;1,6c;1,iw;1,25;1,hy;1,cg;1,b9;1,15v;1,q4;1,21;1,q1;4j,bh;1,k2;1,7k;1,8;1,p;1,81;1,yi;1,1r;1,y;1,p;1,jt;1,2cf;1,y8;1,b;1,l2;1,2c;1,3z;1,7d;1,k0;1,9r;1,h;1,4z;1,-e1j;1,36r;1,32;1,24h;1,1sb;1,va;1,6u;1,c6;1,-8ba;1,1um;1,d5;1,3a9;1,ap;1,2cf;1,589;1,vx;1,nk;1,-bp5;1,5x;1,6ws;1,-bcl;1,44;1,o;1,bz;1,p;1,r7;1,12z;1,d3;1,iu;1,31;1,22;1,3u;1,90;1,hh;1,ed;1,1h;1,2g;1,4q;1,2;1,au;1,a2;1,81;1,62;1,65;1,ao;1,14;1,1j;1,1r;1,cg;1,3n;1,kt;1,33;1,8t;1,f5;1,8c;1,7b;1,3h;1,36;1,g1;1,5s;1,xl;1,1iz;1,6g;1,c4;1,wf;1,t;1,3y;1,3y;1,2u;1,2c;1,rq;1,28;4j,6;1,4m;1,1e4;1,-f6g;1,2j;1,kr;1,iw;1,16h;1,76;1,a5;1,n8;1,yn;1,1f4;1,1vy;1,cf;1,1b5;1,rx;1,n7;1,e3;1,ng;1,nd;1,yf;1,1j;1,4i;1,7j;1,1dq;1,-fp8;1,ag;1,3p;1,66;1,p5;1,1r6;1,2f;1,u7;1,83;1,7w;1,2g;1,55;1,-1;1,10;1,ao;1,1m;1,86;1,108;1,2h;1,e1;1,3i;1,1x;1,hs;1,i8;1,f0;1,4;1,3p;1,1t;1,39;1,ea;1,20;1,2t;1,8c;1,ev;1,12s;1,4p;1,q8;1,2z;1,ka;1,6g;1,bj;1,25;1,ae;1,uw;1,4a;1,174;1,-avq;1,4e0;1,3ho;1,174;1,-b57;1,4y;1,-1q0;1,32f;1,37o;1,-6wm;1,29c;1,sn;1,7m;1,57;1,1gq;1,zo;1,191;1,16o;1,lw;1,2i;1,45;1,my;4j,2in;1,b;1,11l;1,4a;1,-dl4;1,1kw;1,1au;1,5d;1,w4;1,5kv;1,-9pr;1,7o;1,1s;1,5n;1,1vn;1,7on;1,-8re;1,-2;1,ba;1,nl;1,ga;1,g5;1,70;1,1hf;1,5w;1,5c;1,1l;1,xq;1,22;1,7s;1,8z;1,8a;1,mh;1,br;1,1c5;1,52;1,16;1,3a;1,vx;1,xo;1,o0;1,22;1,kr;1,7u;1,4p;1,72;1,7x;1,4;1,ky;1,13g;1,-63b;1,bw;1,-8uz;1,8n;1,5h;1,16q;1,tj;1,7g;1,1um;1,ro;1,m5;1,8s;1,9i;1,80;1,v7;1,12s;1,2m7;1,1kv;1,2c;1,192;1,ms;1,-4ji;1,-afo;1,5h;1,bbo;1,1vr;1,-cb4;1,4m6;1,-a8;1,k6;1,4s9;1,-8nw;1,1rk;1,12o;1,-sv;1,2r2;1,tw;1,52;1,1or;1,19i;1,1ap;1,cf;1,-ce5;1,13z;4j,5d;1,hx;1,g;1,1p3;1,mi;1,6;1,a0;1,5c;1,55;1,42;1,83;1,m;1,q7;1,72;1,1m;1,ia;1,1q1;1,1s;1,84;1,e;1,qq;1,p5;1,2o;1,6p;1,4q;1,q;1,v5;1,ok;1,m0g;1,-liw;1,56;1,j8;1,-51a;1,md;1,u;1,t9;1,f7;1,-8kw;1,5p;1,ip;1,24a;1,6r;1,fb;1,2;1,f6;1,8e;1,dl;1,bl;1,b0;1,10c;1,4b;1,1l;1,56;1,2m;1,88;1,1p;1,31;1,gr;1,tf;1,k;1,ri;1,ms;1,o8;1,bn;1,if;1,ey;1,5h;1,3m;1,or;1,ja;1,g;1,44;1,-e4j;1,vh;1,16h;1,67;1,nk;1,20l;1,2go;1,6w;1,tn;1,4p;1,1e9;1,11m;1,16l;1,6a;1,f5;1,-8cu;1,ae;1,t0o;1,-w06;1,4m8;1,2va;1,3f6;4j,xz;1,k0;1,-avl;1,fx;1,2oi;1,-6ls;1,as;1,3r;1,q2;1,eu;1,1hs;1,3j;1,2lv;1,1v;1,2nb;1,jz;1,oys;1,-l9x;1,3l;1,bo;1,-8x1;1,6t;1,3r6;1,n8;1,4vf;1,9c;1,25n;1,-blm;1,267;1,fr;1,jm;1,1e;1,162;1,9a;1,hc;1,-cw;1,di;1,2ki;1,a8;1,1gz;1,wj;1,1o;1,-e1f;1,1wm;1,1s7;1,g7;1,4ch;1,-8qp;1,k6;1,xi;1,1r3;1,1;1,4h;1,qa;1,46l;1,3ax;1,4;1,-brh;1,o;1,gk;1,jg;1,zv;1,x0;1,40;1,ck;1,tm;1,4u;1,16;1,30;1,mj;1,zb;1,32;1,ro;1,ln;1,vm;1,1ba;1,80;1,al;1,6e;1,-a9z;1,1ff;1,r4;1,14;1,ox;1,u0;1,41x;1,13j;1,17r;1,91;1,2hy;1,1a;1,-cq3;1,4ff;1,3tt;4j,3fa;1,-bmw;1,1kn;1,1du;1,7fc;1,-apl;1,xk3;1,-x4b;1,1ye;1,11f;1,4d;1,55;1,f3;1,4z;1,1t3;1,1g4;1,25m;1,2mu;1,1kv;1,2k;1,-e70;1,v8;1,gl;1,pd;1,xg;1,1d4;1,1l0;1,8h;1,13u;1,1d7;1,1i4;1,p7;1,1fi;1,8c;1,h3;1,a8;1,sa;1,1s;1,bp;1,-dse;1,l6;1,44;1,20j;1,yz;1,25g;1,2ss;1,3fv;1,1a;1,yw;1,-dbg;1,28d;1,3ag;1,8t;1,1eo;1,io;1,w2;1,13;1,2s5;1,21;1,-a04;1,bk;1,uw;1,129;1,2xn;1,mw;1,dd;1,3u9;1,dc;1,gm;1,-9i7;1,1hd;1,1hg;1,3np;1,n8;1,1e2;1,2h2;1,w5;1,ilm;1,-x4t;1,43g;1,1au;1,9m;1,2y9;1,2km;1,11k;1,1c;1,22e;1,-ed3;1,2q;1,h5;1,2i4;1,6o;1,2f;1,153;4j,34;1,20;1,63;1,199;1,44;1,1fb;1,4k;1,d;1,5g;1,1n;1,1ah;1,de;1,2l;1,38;1,e8;1,1fd;1,77;1,rh;1,15;1,z;1,-d0r;1,1e6;1,5cs;1,162;1,2zt;1,l4;1,-934;1,ri;1,1h7;1,85z;1,-c06;1,vs;1,pn;1,xb;1,65;1,kf;1,53x;1,fn;1,xh;1,2n2;1,-91x;1,-3ya;1,2g8;1,1yk;1,-2uc;1,201;1,6j;1,12e;1,2y;1,4m;1,ul;1,1n3;1,lt;1,1rk;1,a6;1,1ba;1,k9;1,gl;1,7p;1,1l;1,29;1,ac;1,8;1,3m;1,n5;1,nv;1,d3;1,-fek;1,7rf;1,sh;1,bh;1,2f;1,3c;1,h1;1,1au;1,1w5;1,r;1,3o;1,7s;1,-8a3;1,m2;1,26c;1,-6rt;1,46s;1,azy;1,-fbr;1,2vv;1,2ie;1,5ek;1,2z;1,q;1,-7ur;1,6ip;1,ge;4j,1s2;1,-ban;1,2r;1,e3;1,si;1,e3;1,40p;1,312;1,3e;1,4s;1,6f;1,2ba;1,rq;1,1qu;1,pf;1,-fb2;1,-c0;1,yk;1,2mz;1,2lt;1,-3ig;1,-2jg;1,4c;1,14w;1,1dh;1,au;1,ee;1,1m7;1,tj;1,7d;1,sa;1,t2;1,w;1,31;1,qh;1,1b;1,ou;1,1g;1,ab;1,hy;1,xh;1,1o3;1,1il;1,kq;1,13z;1,-f7v;1,3i;1,duw;1,-30j;1,-bs7;1,53j;1,1f8;1,-66p;1,2el;1,2b7;1,z7;1,6o;1,1b7;1,ss;1,52u;1,bj;1,-2bc;1,-2qo;1,25;1,-56u;1,-3dh;1,15a;1,4a;1,og;1,6v;1,1fv;1,9v;1,3n;1,v4;1,f3;1,4ww;1,3yj;1,oh;1,18;1,-ek1;1,mf;1,dt;1,fs;1,w3p;1,-tyh;1,tyi;1,-tgg;1,ax;1,aa;1,1k4;1,1a;1,tv;1,m;1,4bj;4j,201;1,-cmf;1,c5;1,9s;1,1k2;1,gi;1,1x0;1,zu;1,2d;1,2ku;1,2je;1,-9pn;1,7up;1,-5u1;1,3ty;1,1th;1,2gd;1,-ac6;1,2c9;1,13i;1,-2sm;1,ho;1,38e;1,rkk;1,-n16;1,-aal;1,is;1,116;1,1di;1,8b;1,20r;1,6i;1,3k;1,2su;1,14g;1,ee;1,25u;1,kq;1,1kx;1,j83;1,-th9;1,259;1,-26r;1,37;1,-3w6;1,jm;1,lr;1,a27;1,-81b;1,1ef;1,sr3;1,-q3u;1,12v;1,f3;1,3op;1,-b2s;1,3ie;1,4oj;1,1ij;1,1cm;1,1mh;1,-e69;1,1r3;1,2d;1,1rd;1,8ze;1,26z;1,-bf1;1,3do;1,6zh;1,-cc5;1,kl;1,q6;1,wm;1,f7;1,25;1,hp;1,12j;1,2k;1,z2;1,ei;1,se;1,1fn;1,mu;1,27i;1,20s;1,-dtf;1,10e;1,37h;1,24p;1,ij;1,4p2;1,l9;1,h7;4j,t5;1,-dkv;1,hu;1,31b;1,-3xf;1,13v;1,2aa;1,xt;1,1fo;1,6c;1,y5;1,4x;1,1ei;1,31s;1,ly;1,-8xc;1,36p;1,a3;1,3an;1,-6fu;1,-3f3;1,40;1,3jm;1,35y;1,1vk;1,f5;1,e9;1,38k;1,1gg;1,h8;1,-2n7;1,-aj0;1,1e1;1,1tp;1,5lp;1,18o;1,-aph;1,1di;1,nh;1,3j;1,14;1,1a1;1,5dj;1,w3;1,37w;1,5u;1,-e1f;1,ql;1,8;1,2;1,af;1,38;1,eh;1,1ds;1,er;1,hx;1,m;1,4k;1,trl;1,-rvp;1,3p;1,1mz;1,ht;1,1po;1,29;1,bz;1,ar;1,29;1,rf;1,3p;1,1dl;1,kf;1,177;1,ic;1,-c3w;1,1nz;1,15;1,1tg;1,dx;1,qv5;1,-xle;1,i0;1,2jx;1,dl;1,16o;1,jq;1,yx;1,15s;1,w6;1,2yo;1,sx;1,2fi;1,-3;1,an;4j,-dqa;1,7dq;1,-3bg;1,6n8;1,9f;1,2fy;1,7a;1,-bhu;1,mn;1,3rb;1,70;1,3jx;1,1jo;1,14z;1,-d8p;1,2df;1,3t;1,2kn;1,1ds;1,ba;1,15;1,14r;1,1iw;1,4gv;1,-evi;1,d0t;1,-d2p;1,96;1,up;1,12h;1,14p;1,1go;1,1ab;1,1ia;1,2zm;1,rz;1,122;1,pc;1,1ce;1,zb;1,-dac;1,iv;1,8go;1,xw;1,3og;1,-d0i;1,wm;1,11;1,12c;1,19i;1,jv;1,3l;1,3b;1,30b;1,4b;1,49t;1,1;1,5a;1,ar;1,-dpd;1,c0i;1,-c3r;1,fi;1,3x;1,4r;1,13;1,46p;1,l6;1,36r;1,we;1,37a;1,rf;1,1ky;1,-epd;1,5c;1,6q2;1,36a;1,2ww;1,1c;1,3s;1,-e62;1,2v;1,25h;1,6w;1,lt;1,gr;1,g5;1,ye;1,5w;1,ud;1,bt;1,3d5;1,9v;1,b3;4j,noe;1,1;1,-jd0;1,-ehs;1,c0;1,v2;1,kg;1,cn;1,en;1,22;1,179;1,1in;1,sg;1,j0;1,4pi;1,dm;1,3z;1,39;1,13v;1,1uz;1,5n;1,-e7u;1,48q;1,-4rm;1,2ua;1,1qv;1,5iw;1,zp;1,-bdt;1,12e;1,il;1,5rs;1,5rj;1,1d6;1,7e;1,26;1,1u;1,-dae;1,gc;1,918;1,ra;1,-7zz;1,1tw;1,1ol;1,5ef;1,-70r;1,8kj;1,q5;1,-cua;1,4vf;1,5ez;1,1z2;1,-e51;1,2lc;1,fm;1,k2;1,v7;1,1ao;1,qo;1,k9;1,1h;1,1x;1,mj;1,10;1,16e;1,v;1,5d;1,t0;1,17f;1,mgo;1,-lk8;1,12f;1,17q;1,-c2m;1,65f;1,2q4;1,341;1,-c39;1,-25o;1,ok;1,162;1,qn;1,18h;1,20r;1,134;1,2rw;1,2;1,ij;1,2zx;1,129;1,-eiw;1,ik;1,5p;1,12y;4j,1jr;1,2n4;1,ek;1,8n;1,23;1,2n;1,6b;1,gn;1,3k;1,2xt;1,uw;1,5b;1,1if;1,4a;1,ld;1,16t;1,-e9m;1,2qx;1,ax;1,3r;1,11o;1,61y;1,1rl;1,o5;1,15o;1,-egt;1,1w;1,162;1,ux;1,11;1,3n;1,mw;1,he;1,lr;1,i;1,qq;1,2l;1,138;1,am;1,2u;1,3r;1,4i;1,4c;1,24;1,9;1,38;1,hf;1,9h;1,1h;1,3q;1,c3;1,jt;1,oe;1,9g;1,jn;1,cl;1,cl;1,2c;1,b3;1,h;1,7p;1,sj;1,6r;1,1fm;1,us;1,2t;1,-az8;1,91;1,9cx;1,-avx;1,2b9;1,1k8;1,1z;1,16p;1,7pf;1,-bph;1,65;1,56d;1,-7kb;1,21g;1,2me;1,39;1,2f;1,q6;1,2el;1,1v8;1,pf;1,3sf;1,-en9;1,ae;1,1a1;1,305;1,181;1,zu;4j,t4;1,1d;1,1rn;1,8u;1,1aa;1,5s;1,9z;1,24s;1,jh3;1,-tg7;1,1j;1,3v3;1,1;1,c0;1,-8qb;1,1gi;1,qe;1,gm;1,k5;1,fc;1,mw;1,1hi;1,-zg;1,dq;1,152;1,ng;1,nf;1,1nc;1,3uk;1,1yd;1,cc;1,-99m;1,ba;1,vh;1,4xv;1,1vt;1,-dei;1,2fw;1,9o;1,4l;1,4p;1,1m;1,s;1,zb;1,1;1,o1;1,m4;1,bi;1,2y;1,49;1,dm;1,nk;1,dn;1,116;1,2u;1,1ez;1,sl;1,1ru;1,18c;1,1me;1,-exg;1,q7;1,1lp;1,3z;1,60;1,1e;1,9v;1,vj;1,4d;1,pl;1,nm;1,cg;1,5e;1,l6;1,268;1,no;1,ae;1,ps;1,r8;1,f0;1,-bi9;1,6i7;1,-4po;1,2xh;1,87t;1,-cgm;1,bc;1,yf;1,1yj;1,1p;1,90;1,d2;1,z2;1,1l;4j,vp;1,2ux;1,3b5;1,1qw;1,-eqm;1,2y;1,ox;1,38;1,1a;1,99;1,1o;1,1oa;1,99;1,1ip;1,209;1,hj;1,5k8;1,-c2y;1,o;1,12p;1,2y;1,4s6;1,3v;1,30;1,3w5;1,v7;1,-70r;1,65c;1,-9hd;1,3bx;1,24m;1,3qf;1,-9ns;1,gg;1,4dk;1,-2g8;1,2s;1,tt;1,ij;1,24e;1,52i;1,to;1,335;1,-fql;1,46h;1,2hd;1,wr;1,3cx;1,-7ib;1,8h6;1,3oq;1,-f5d;1,4v;1,7m;1,566;1,3wi;1,5w9;1,-b7g;1,zy;1,12t;1,119;1,-6oi;1,1o6;1,6fi;1,2kv;1,-646;1,t;1,9;1,-4jy;1,2ew;1,2j1;1,3o8;1,fn;1,-9pu;1,7c;1,qm;1,5r;1,2q;1,m7;1,7x;1,lf;1,p9;1,-1;1,49;1,tp;1,3s;1,243;1,w;1,1;1,6l;1,1ds;1,2h;1,14i;1,24e",
	JOHAB: "q4k,9pv;2,2;1,1;3,4;1,1;1,1;1,1;1,1;1,1;1,1;4,4;d,b;w,1;w,1;w,1;w,1;2o,1;w,1;w,1;w,1;w,1;w,1;2o,1;w,1;w,1;w,1;w,1;w,1;2o,1;w,1;w,1;w,1;4g,-1e;w,o9b;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-opl;w,opm;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-p5v;w,p5w;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-pm4;w,pm5;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-q2f;w,q2g;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-qiq;w,qir;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-qyu;w,qyv;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-rf5;w,rf6;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-rvg;w,rvh;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-sbq;w,sbr;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-ss1;w,ss2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-t8c;w,t8d;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-ton;w,too;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-u4y;w,u4z;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-ul9;w,ula;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-v1k;w,v1l;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-vhv;w,vhw;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-vy6;w,vy7;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;3o,-weh;w,wei;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1w,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;4,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;2,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;12s,-x43;1,1;1,1;1,-9cb;1,67i;1,1;1,-67y;1,9cr;1,-9cm;1,67c;1,eo;1,17o7;1,-17nk;1,-f8;1,1;1,3;1,1;1,35j;1,1;1,-d;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-9cw;1,12;1,w;1,6ll;1,4;1,1;1,-1z;1,m;1,-6mc;1,682;1,1;1,5s;1,14;1,17zp;1,1;1,4;1,-16zn;1,-2;1,-tc;1,3p;1,31;1,-7k;1,5;1,2i;1,-f;1,-6nf;1,68k;1,157;1,-1;1,-1m;1,4;1,-1;1,-7;1,-1;1,-11;1,-1;1,j;1,-1;1,b;1,-1;1,-tm;1,-2;1,1;1,2;1,1;1,2v3;1,-2p5;1,1;1,-29;j,z;1,-w;1,o;1,-a;1,1;1,-10;1,3;1,3f;1,1;1,-5;1,1;1,-2h;1,-1;1,-2;1,1;1,17sq;1,-17v4;1,2;1,18;1,3;1,-6kv;1,1eay;1,-1dw7;1,h;1,5;1,-3;1,-1;1,-f5;1,f7;1,-fu;1,u;1,ep;1,672;1,-t;1,-2;1,-6ln;1,6ed;1,-61;1,13l;1,-1;1,-9;1,-1;1,4u;1,-4;1,1;1,4;1,2;1,-4;1,-qy;1,mn;1,-11;1,19;1,1;1,-1r;1,i;1,1;1,3;1,-1;1,-1;1,3;1,5b;1,-2h;1,-1;1,e;1,2;1,-7e0;1,67e;1,1;1,ac;1,2;1,2;1,-3;1,2;1,yd;1,-4;1,1;1,2;1,2dv;1,-2r;1,-3d2;1,3ox;1,-3ol;1,3og;1,m;1,-3p3;24,17ts;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,4r;1,-4p;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;j,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,3q;1g,-14sf;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1f,-36m;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;6,-p;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;8,-5w8;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;9,8;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;j,1;1,1;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;7,6k7;1,2;1,a;1,4;1,8;1,-4;1,8;1,g;1,-8;1,g;1,8;1,-1n;1,2;1,c;1,4;1,8;1,-4;1,c;1,g;1,-8;1,g;1,g;1,-17;1,f;1,-7;1,f;1,8;1,-y;1,j;1,-b;1,j;1,a;1,-1c;1,-1;1,9;1,-1;1,-3;1,-1;1,-7;1,-1;1,h;1,1;1,2;1,1;1,4;1,1;1,2;1,1;1,3;1,1;1,3;1,1;1,3;1,1;1,3;1,1;1,3;1,1;1,2;1,1;1,2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;25,2tn;1,1;1,1;1,-3no;1,3np;1,18;1,-x;1,1;1,1;1,1;1,-d;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,14;1,-1p;1,1;1,1;1,1s;1,-1z;1,1;1,1r;1,-x;1,1;1,8;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-1l;1,1;1,1;1,1;1,1;1,1i;1,1;1,1;1,1;1,1;1,1;1,-1b;1,1;1,1;1,1;1,1;1,-3n2;1,3oa;1,1;1,-1j;1,1;1,1;1,22;1,-h;1,-o;1,1;1,1;1,18;1,-1e;1,1;1,1;1,1;1,1d;1,-d;1,3;1,-g;1,6;1,j;j,-m;g,-a2o;1,a;1,-12;1,3g;2,c;2,d;1,2;1,-2x;1,3e;1,-48;1,10;1,3s;1,-s;2,9p2;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-2p7;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-3t;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-71t;1,6fq;1,1;1,-6fs;1,2;1,6fx;1,1;1,1;1,1;1f,-6ew;1,17;1,-x;1,1j;1,a;1,2;1,5;1,8;1,2;1,-22;1,2j;1,-38;1,v;1,2x;1,-s;1,-2;1,9mf;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-2nz;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-1t;1,1;1,1;1,1;1,1;1,1;1,1;1,1;j,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-72h;1,-7;1,1;1,69t;1,b;1,2;1,1;1,1;1,1;1,33x;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1q,e;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;j,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;9,-8va;1,1;1,1;1,1;1,1;1,1;1,-k;1,l;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;g,1;1,1;1,1;1,1;1,1;1,1;1,s;1,-r;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;8w,esu;1,1i;1,5w;1,4y;1,br;1,9b;1,3q;1,34;1,84;1,xk;1,6t;1,24x;1,8f;1,1;1,1k;1,nx;1,1o6;1,e8;1,vu;1,1pb;1,15;1,11v;1,1d;1,by;1,ia;1,7b;1,8c;1,6j;1,1yn;1,-e56;1,8p;1,40;1,2g6;1,6y;1,21k;1,1lf;1,2mj;1,1pc;1,o;1,2c1;1,-duo;1,hz;1,1bo;1,56;1,32;1,wc;1,7;1,ni;1,e1;1,p2;1,4m;1,43;1,1eg;1,1br;1,59;1,dm;1,7n;1,6v;1,82;1,vw;1,cx;1,3;1,1oa;1,23s;1,-e20;1,1f6;1,3fe;1,1fh;1,227;1,ga;1,1v2;1,xh;1,-ci;1,38a;1,-dlc;1,vq;1,64;1,10i;j,r7;1,4f;1,2r;1,n5;1,hb;1,hf;1,rb;1,1dp;1,4b;1,8g;1,5p;1,13e;1,3ud;1,pu;1,1;1,283;1,-f3m;1,1vt;1,4ue;1,2ax;1,3fp;1,ns;1,-da5;1,14d;1,d0;1,jp;1,3a;1,bk;1,3n;1,g;1,fh;1,25k;1,1sr;1,c;1,1ga;1,43;1,1q;1,d7;1,co;1,5p;1,og;1,q8;1,d6;1,1k1;1,nl;1,16i;1,-fb0;1,18;1,7o;1,di;1,19a;1,1rc;1,7;1,16;1,r5;1,xd;1,10n;1,1as;1,69;1,28;1,xd;1,1em;1,fa;1,myd;1,-k0p;1,dg;1,-cnf;1,17m;1,-up;1,vxs;1,-ojy;1,li;1,3jw;1,-cy5;1,pf;1,1oq;1,bn;1,yy;1,4c;1,a4;1,d;1,1tl;1,i4;1,1pr;1,41u;1,1t;1,l44;1,-kn9;1,co;1,4z;1,-diy;1,3c;1,a7;1,2op;1,70;1,ek;1,1n5;1,4re;1,yr;1,1kj;1,10u;1,1bq;1,-ez1;1,fn;1,4in;1,5s;1,-4l3;1,as;1,5;1,4r4;1f,2l6;1,578;1,2is;1,-f1l;1,2o4;1,9fn;1,-ckq;1,3fl;1,g4;1,65;1,oi;1,g8;1,118;1,3ig;1,1ll;1,2k3;1,-ccv;1,588;1,1b;1,go;1,1o5;1,6s;1,fw;1,1r6;1,dl;1,z3;1,2jy;1,-bm0;1,1yp;1,ka;1,2rg;1,dm;1,25l;1,-b6v;1,34e;1,577;1,324;1,1fi;1,8l;1,-dls;1,87;1,23;1,4g;1,20;1,cb;1,c;1,4y;1,s1;1,7n;1,17b;1,6v;1,dh;1,1i;1,ma;1,4e;1,77;1,24;1,1l;1,bn;1,z4;1,la;1,30;1,q6;1,6;1,11;1,7j;1,ib;1,3k;1,dv;1,n;1,gf;1,26;1,hu;1,16;1,64;1,hn;1,1jk;1,q7;j,74;1,r0;1,te;1,1h;1,f6;1,b2;1,-f1i;1,13l;1,kn;1,7r;1,eq;1,6b;1,vm;1,9m;1,180;1,32;1,1k;1,14y;1,1b6;1,8c;1,gm;1,a7;1,ji;1,a8;1,h;1,2a4;1,49;1,bi;1,21b;1,1fa;1,-elc;1,5;1,2p;1,13;1,i1;1,k7;1,b7;1,5z;1,hc;1,uk;1,g0;1,e;1,19;1,8e;1,7j;1,eq;1,l8;1,1tr;1,44;1,6m;1,jl;1,11x;1,33;1,4e;1,6m;1,9j;1,n;1,6r;1,cx;1,hc;1,3n;1,dt;1,lsu;1,-ktj;1,pe;1,pl;1,bk;1,hd;1,u3;1,-ena;1,3am;1,9j;1,bh;1,3ht;1,3jr;1,3e1;1,-dww;1,38;1,14d;1,1rp;1,iz;1,s;1,181;1,10q;1,41i;1,3t2;1,-9do;1,rrw;1,-in0;1,-etp;1,cx;1,5;1,8e;1,1px;1,i9;1,h7;1,t;1,hw;1,52;1,b8;1,2vy;1,1b5;1,2eh;1,16n;1,25p;1,-ehp;1,2pb;1,17r;1,13o;1,2m8;1f,z9;1,1z6;1,1bo;1,17;1,mu;1,h2;1,l9;1,zf;1,-bcj;1,26t;1,5jr;1,25q;1,kk8;1,-x2d;1,1yw;1,2c;1,12v;1,1hz;1,g4;1,zy;1,rn;1,4p;1,1c9;1,q7;1,vp;1,16j;1,kr;1,1td;1,ng;1,-e0q;1,2sv;1,i7;1,8wm;1,-cqg;1,cf;1,d4;1,14o;1,16y;1,1kt;1,194;1,o2;1,fc;1,7o;1,1h6;1,141;1,3u2;1,-ctx;1,379;1,5hs;1,-9p1;1,fe;1,1je;1,44;1,1fw;1,71;1,bt;1,1ds;1,9rl;1,-cky;1,6mh;1,pl;1,2we;1,-csb;1,fh;1,rf;1,74;1,128;1,ic;1,1z;1,1fn;1,10;1,k3;1,fe;1,1p2;1,q5;1,9t;1,12n;1,ij;j,br;1,q6;1,b5;1,1lw;1,23;1,ak;1,1mh;1,9e;1,9i;1,-fbn;1,19;1,o;1,2y;1,8a;1,au;1,av;1,1u;1,4j;1,2;1,4p;1,au;1,9t;1,19;1,th;1,cg;1,95;1,mk;1,64;1,hl;1,h3;1,1d;1,de;1,at;1,3a;1,12;1,2e;1,gr;1,d7;1,gv;1,5b;1,31;1,qk;1,16;1,i5;1,ll;1,i2;1,dv;1,9;1,5;1,5x;1,137;1,k1;1,cp;1,ck;1,9d;1,4g;1,c3;1,2a;1,1ek;1,37;1,is;1,6m;1,cl;1,-ec1;1,111;1,7t6;1,3x2;1,b;1,1e1;1,-eqh;1,7lp;1,zw;1,1th;1,16c;1,es;1,-b8h;1,ug;1,1g0;1,4jr;1,-641;1,o5;1,5eu;1,1h;1,1k0;1,2e6;1,-ccm;1,eq;1,5c;1,3j;1,pd;1,2cr;1,3j;1,1i0;1,jd;1,1v8;1,-70y;1,69e;1,3kh;1,1se;1,1gf;1,-97f;1,p5;1,x9;1,5bx;1,v3;1,22n;1,iwr;1,-sy7;1,zl;1,6kc;1f,2vc;1,iiz;1,-wm4;1,n6;1,f5;1,22g;1,185;1,1yn;1,uz;1,hh;1,b;1,ft;1,1h3;1,10a;1,ro;1,jm;1,12r;1,-d65;1,uk;1,5xc;1,17d;1,1nw;1,2tu;1,kbu;1,-s6o;1,-4y5;1,74;1,1o;1,32w;1,1bt;1,4d;1,8x0;1,-dsk;1,db;1,1s;1,2xr;1,rl;1,id;1,cm;1,22n;1,1cd;1,1gu;1,8i;1,153;1,av;1,wo;1,1vc;1,iww;1,-xmn;1,24t;1,27v;1,8v;1,vx;1,1wm;1,11p;1,1o;1,1rg;1,15h;1,1;1,68;1,m23;1,-k4k;1,-dgb;1,xr;1,2fv;1,gc;1,1z5;1,3ag;1,24;1,-98u;1,ju;1,7lm;1,1qr;1,-9ta;1,d;1,h4;1,a;1,v0;j,3w;1,5v;1,5b;1,2;1,7s;1,1f;1,24;1,fl;1,5o;1,3i;1,6b;1,3x;1,9a;1,j8;1,nr;1,c;1,8r;1,1;1,1r;1,a5;1,-7;1,bf;1,63;1,6h;1,2i;1,5;1,91;1,15d;1,3y;1,4;1,2g;1,x;1,5x;1,7;1,le;1,32;1,2a;1,6;1,1;1,1e;1,ez;1,a3;1,56;1,cu;1,3i;1,13;1,2n;1,1vw;1,8n;1,6x;1,8f;1,14a;1,3;1,14u;1,33;1,59;1,1;1,2e;1,tp;1,-6h4;1,-95g;1,wj;1,2xx;1,12e;1,871;1,-bvq;1,-vl;1,x5d;1,1;1,-ve8;1,1je;1,tuv;1,-toe;1,1c;1,tn3;1,1;1,1;1,1;1,1;1,1;1,-kmo;1,kmp;1,1;1,1;1,1;1,1;1,-lqy;1,lqz;1,1;1,1;1,1;1,-sxy;1,sxz;1,-qtj;1,qtk;1,1;1,-jek;1,jel;1,-tld;1,17;1,-36r;1,wqy;1,-sr6;1,cx;1,103;1,re7;1,-q23;1,q24;1,1;1,1;1f,-oig;1,oih;1,1;1,-m9h;1,-9t4;1,ni;1,vf4;1,1;1,1;1,1;1,1;1,-xrd;1,xre;1,-x52;1,1k1;1,2w8;1,4rk;1,nxa;1,-vjv;1,zl;1,17q;1,46o;1,-53p;1,3b;1,gs;1,4z;1,-1hw;1,-g;1,-1t9;1,ww5;1,-vjv;1,14l;1,6h;1,u8u;1,1;1,1;1,-q8p;1,q8q;1,1;1,1;1,1;1,1;1,1;1,-iuf;1,iug;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-r5s;1,r5t;1,1;1,-nly;1,2r7;1,-98h;1,u39;1,1;1,-noh;1,noi;1,1;1,-v0q;1,v0r;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,-vag;1,9bw;1,-6ui;j,49h;1,ojm;1,1;1,1;1,1;1,1;1,1;1,-nru;1,nrv;1,1;1,-v19;1,3ah;1,-52e;1,5ff;1,-49s;1,8bg;1,-agt;1,3h;1,40;1,19k;1,a2;1,bz;1,1an;1,19d;1,1b;1,wq;1,8l;1,ig;1,1wg;1,le;1,8f;1,cg;1,1rh;1,cn;1,1pc;1,fd;1,-97k;1,26b;1,qk;1,fy;1,598;1,-bni;1,dz;1,225;1,m2;1,dv;1,1ei;1,3e;1,7m;1,24;1,187;1,21f;1,ai;1,p0;1,ua;1,90;1,43;1,1j9;1,-7m4;1,1q8;1,16p;1,3p7;1,ge;1,-bpp;1,ky;1,2e;1,16y;1,px;1,if;1,ua;1,2hi;1,1gg;1,259;1,4l1;1,-ft1;1,1ph;1,-q;1,c9;1,km;1,4k;1,at;1,9b;1,j3;1,j1;1,2xe;1,2tj;1,1ap;1,tp;1,1xu;1,1n5;1,-dau;1,tu;1,70;1,-3a9;1,dq;1,1c;1,yu;1,7z;1,y;1,qf;1,2a;1,46;1,45;1,7v;1,6k;1,8a;1,gl;1,3c;1,3y;1,to;1f,52;1,cp;1,ly;1,21;1,4z;1,7k;1,ey;1,ym;1,4d;1,fs;1,3u;1,1xl;1,145;1,n8;1,7a;1,2d;1,cb;1,h;1,1r;1,4q;1,gg;1,mh;1,9y;1,-8p6;1,tw;1,gi;1,22;1,5i;1,sb;1,gs;1,f9;1,jb;1,2jp;1,-a1j;1,1lq;1,wv;1,47;1,5d;1,15a;1,wi;1,4r;1,58x;1,2bd;1,-ejq;1,8pg;1,-8mc;1,jz;1,x;1,7c;1,8n;1,2or;1,156;1,67;1,3z;1,u7;1,gu;1,18g;1,dz;1,mq;1,173;1,of;1,2si;1,-cvd;1,3zv;1,cl;1,1j;1,2th;1,z3;1,1po;1,naf;1,-ljo;1,r5;1,1li;1,-bsu;1,7dd;1,62;1,2p3;1,1a;j,bi;1,-9yu;1,-e2;1,2ik;1,1gv;1,xf;1,y6;1,23f;1,10g;1,17n;1,1s9;1,-dk9;1,2gf;1,twl;1,-pv6;1,1ss;1,1bu;1,aj;1,8u;1,1hz;1,kp9;1,-rpd;1,qm;1,lh;1,1vn;1,1cs;1,n4w;1,-kj7;1,1on;1,iul;1,-xr0;1,z7;1,4nj;1,e;1,10s;1,d9;1,3yq;1,4q9;1,-ez6;1,c47;1,-9xv;1,1hx;1,1z;1,162;1,yd;1,2fs;1,gp;1,1f5;1,pj;1,2h;1,-7p0;1,64v;1,18n;1,-85x;1,1n1;1,18z;1,13m;1,7d;1,2y;1,3rn;1,1uk;1,-cwo;1,2o7;1,ib;1,76y;1,-9xv;1,3jd;1,3id;1,-7nb;1,9k;1,9v;1,2o;1,4hk;1,b4;1,3od;1,3;1,1i;1,13c;1,1nn;1,uh;1,j8;1,-d21;1,ap;1,ce;1,99;1,23u;1,hu;1,5s;1,p3;1,105;1,10k;1,1t8;1,2ia;1,g7;1,2oa;1,xh;1,8;1,tp;1,1j;1,-f1v;1,3zf;1,xd;1,x2;1,1se;1,4dz;1,1k0;1,-alu;1,34;1,mb;1,1z4;1f,fa;1,n4;1,1uz;1,hn;1,vz;1,20o;1,71;1,mf;1,-cy5;1,2i;1,3w;1,57t;1,qk;1,4qi;1,-8ah;1,1bt;1,17w;1,t0;1,2gs;1,-1qh;1,-781;1,2a;1,1j7;1,w2u;1,-uxx;1,74;1,gy;1,3va;1,1h7;1,vh;1,1g;1,3c;1,34o;1,eu;1,xu;1,2a;1,5s;1,1ft;1,-frq;1,6cc;1,1zb;1,4qu;1,zn;1,-deh;1,ww2;1,-teg;1,1o;1,173;1,wb;1,56;1,e0;1,yf;1,1sq;1,16t;1,2e;1,1hv;1,7q;1,1m5;1,u5;1,i3;1,3f;1,-7hl;1,6r;1,td;1,17t;1,30b;1,29n;1,k;1,-3wd;1,-9vb;1,17p;1,1lv;1,1s0;1,x4;1,1ht;1,ta;1,-9ct;1,64n;j,fu;1,19k;1,3y0;1,o;1,q;1,1z7;1,-eb5;1,gk;1,26s;1,ko;1,1c3;1,2et;1,vo;1,a3;1,1p9;1,xe;1,29s;1,23v;1,va;1,-dyt;1,a1;1,f5;1,2pd;1,qv;1,8l;1,1f0;1,1dg;1,7c;1,1d3;1,t6;1,23w;1,h3;1,-ddu;1,3t5;1,f5;1,ch;1,p9;1,9n;1,ab;1,sa;1,2f;1,6x;1,5n;1,g7;1,3pd;1,2lu;1,-e0h;1,3b5;1,abu;1,-e02;1,45;1,2jy;1,3bl;1,34e;1,3g2;1,-9en;1,c9;1,1cj;1,sp6;1,-jiz;1,-ddg;1,915;1,-97z;1,-g;1,4nm;1,3b2;1,pu;1,183;1,3no;1,-dy3;1,gf;1,a7;1,3b;1,73;1,1g7;1,ua;1,1bb;1,9m;1,xw;1,105;1,3b;1,7i;1,3h;1,q8v;1,-pz4;1,1ai;1,lp;1,1r;1,r5;1,11i;1,i;1,1rf;1,4;1,102;1,yv;1,-e5o;1,5ep;1,gi;1,js;1,3fm;1,1ps;1,1kp;1,14k;1,g8;1,-avc;1,184;1,19k;1,2ph;1,46m;1,-63u;1f,in;1,2d;1,aa;1,-4rt;1,35t;1,aw;1,ju;1,18;1,6h0;1,bs;1,o7;1,-d7h;1,hj;1,3bf;1,3ng;1,en;1,2jh;1,-d4x;1,11i;1,1cs;1,q1;1,ak;1,es;1,d7;1,mk;1,43;1,1kz;1,18;1,8o;1,1ff;1,2ha;1,6f;1,mg;1,1co;1,20i;1,l2;1,-e1r;1,2ot;1,vm;1,134;1,4f2;1,19d;1,2s0;1,-ee1;1,25f;1,190;1,1;1,1fm;1,4gn;1,bm;1,n2;1,49;1,42;1,28x;1,aj;1,-b7y;1,dq;1,61;1,8u;1,21j;1,ab;1,6j;1,ne;1,13p;1,2s1;1,2ma;1,18;1,pq;1,24k;1,-56l;1,29u;1,1xe;1,s4;1,v9;1,-dae;1,3as;1,1e0;1,rb;j,-j;1,2lp;1,-9ya;1,b1l;1,-b46;1,20;1,8k;1,4cg;1,qz;1,228;1,s;1,1b3;1,19;1,512;1,1g3;1,-9gw;1,4ek;1,-a5o;1,h4;1,34;1,3gx;1,3z;1,i2;1,12w;1,1ls;1,5u;1,29y;1,bv;1,kd;1,1xm;1,8f;1,21o;1,-41e;1,-b84;1,dg;1,99;1,1d3;1,vr;1,m0;1,mb;1,1;1,fp;1,82;1,gh;1,bw;1,e;1,1ac;1,2;1,dc;1,l3;1,4j;1,1mk;1,it;1,21;1,1kr;1,14;1,9w;1,-7dw;1,12g;1,15j;1,w7;1,3c;1,kg;1,6zn;1,-9wq;1,7n;1,-3u8;1,2ro;1,5tf;1,-9pm;1,10k;1,7a;1,11i;1,z4;1,h1;1,8v;1,1c7;1,z5;1,1ik;1,1kw;1,381;1,-cpb;1,26q;1,qr;1,t;1,1r;1,59;1,dg;1,8l;1,op;1,el;1,2t;1,11y;1,k6;1,9y;1,1rd;1,rc;1,6c;1,h4;1,115;1,f0;1,220;1,18a;1,-dkp;1,dv4;1,-fk7;1,e5;1,fh;1,7o;1,37c;1f,1db;1,39w;1,1;1,nn;1,17w;1,2ye;1,a7;1,-df4;1,51y;1,15g;1,-5x2;1,17r;1,bo;1,7h;1,e9;1,2q;1,1h8;1,b0;1,4t;1,yh;1,8;1,1qd;1,12i;1,m3;1,16h;1,13b;1,yx;1,1gq;1,1hv;1,-d31;1,sf;1,2f;1,4e;1,pw;1,4s;1,1;1,179;1,66;1,1bk;1,16;1,1zs;1,4oj;1,-bf2;1,8k6;1,s4;1,-b77;1,71;1,31v;1,8y;1,4j;1,hu;1,lg;1,ia;1,1di;1,66;1,1di;1,75;1,au;1,of;1,4s;1,ni;1,21z;1,1e6;1,js;1,-eq5;1,t2;1,3n;1,e;1,2y9;1,9s;1,5w;1,41;1,tu;1,mj;1,h6;1,wl;1,9z;1,5q;j,5e;1,o;1,d0;1,17;1,1d;1,t6;1,yu;1,14k;1,1kk;1,1mm;1,65;1,-dv0;1,369;1,cx;1,1vj;1,8d;1,1ez;1,4lr;1,rq;1,4x;1,1os;1,2d;1,-eu8;1,2y;1,1bx;1,gu;1,hs;1,f3;1,8g;1,js;1,lb;1,3f;1,8;1,20;1,aq;1,ep;1,10m;1,1z7;1,v0;1,p5;1,5y;1,4r;1,3s;1,dq;1,dn;1,pq;1,6l;1,13j;1,13g;1,1um;1,-fpf;1,-q;1,xgw;1,-vvu;1,1i7;1,n8;1,52;1,rh;1,1ck;1,k6;1,14a;1,1zd;1,e;1,1lm;1,1;1,10;1,qv;1,g9;1,f8;1,10d;1,-e2j;1,1t;1,2wb;1,1x0;1,2b;1,2u3;1,1;1,79i;1,-c0z;1,2ax;1,1gf;1,2z;1,pi;1,q2i;1,-obn;1,1du;1,4m;1,3qr;1,-eks;1,8qn;1,td;1,4dx;1,-ddw;1,2ed;1,23z;1,p5;1,g;1,3x;1,15g;1,1sl;1,1fj;1,-4dq;1,1gl;1,-6yn;1,b1;1,189;1,2dz;1,14v;1,1zk;1,bz;1f,gh;1,2nk;1,34b;1,9j;1,je4;1,-wsn;1,2ar;1,8sp;1,ta;1,7;1,63;1,-cbp;1,7eo;1,78k;1,jj;1,-fzj;1,dl;1,ab;1,25i;1,f0;1,1if;1,s;1,ay;1,75;1,1ke;1,um;1,5g;1,sk;1,7o;1,40a;1,1yx;1,6g;1,-enf;1,1ms;1,g;1,qt;1,22g;1,zb;1,bw;1,a1;1,77;1,vb;1,93;1,2wu;1,z7;1,1j;1,g9;1,qg;1,-cn9;1,cm;1,fv;1,24;1,1mf;1,t2;1,1gk;1,3nm;1,1ka;1,c6;1,dh;1,s3;1,3j;1,14j;1,2;1,222;1,h9;1,-ag6;1,-4vq;1,aq;1,1u9;1,jc;1,6m;1,1;1,19z;1,12j;1,1m3;1,4l;1,i1;1,1z4;j,1c1;1,eu;1,1sw;1,j4;1,201;1,-fl2;1,5n;1,7r;1,46;1,cx;1,p;1,c7;1,2y;1,nk;1,97;1,8r;1,6s;1,r;1,2f;1,k0;1,ukq;1,-ttc;1,ld;1,1c;1,1jb;1,8n;1,pd;1,1rk;1,7t;1,l3;1,ey;1,1;1,21;1,4m;1,2h;1,7k;1,196;1,il;1,1y;1,l;1,3d;1,1y;1,mm;1,6s;1,u8;1,14;1,ph;1,lq;1,-ekw;1,-7l;1,f7;1,gb;1,fz;1,4h;1,q;1,1ap;1,bp;1,5m;1,pu;1,19q;1,ws;1,14c;1,14z;1,2d;1,1p;1,13l;1,1zp;1,20f;1,jg7;1,-xl8;1,33w;1,2w;1,n7;1,-13t;1,1ya;1,cv;1,336;1,153;1,65l;1,-fo7;1,hw;1,ho;1,l;1,13;1,182;1,67;1,th;1,ff;1,60;1,5b;1,1c;1,lz;1,dz;1,f4;1,fh;1,2;1,1;1,1;1,68;1,rsg;1,-qb7;1,cl;1,ew;1,3j;1,90;1,3;1,iz;1,94;1,eu;1,5g;1f,49;1,3o;1,fk;1,mg;1,cu;1,cx;1,4z;1,9b;1,v2;1,18l;1,al;1,19c;1,-ebz;1,vy;1,ua;1,17k;1,10n;1,70;1,bx;1,id;1,10;1,g8;1,9c;1,4xm;1,18;1,294;1,-asq;1,23q;1,3z5;1,52h;1,-eyc;1,1q;1,g;1,1m;1,2t;1,2;1,1v;1,2o;1,80;1,kz;1,6;1,7i;1,65;1,6w;1,eo;1,3b;1,4v;1,d6;1,f;1,a;1,dr;1,1k;1,a6;1,3o;1,nf;1,fo;1,j;1,g7;1,5;1,4y;1,jy;1,7y;1,1q;1,98;1,di;1,n0;1,xp;1,8s;1,2;1,w;1,2p;1,fc;1,8e;1,2j;1,lw;1,av;1,ap;1,8z;j,dy;1,ew;1,a9;1,e;1,5b;1,cf;1,3u;1,g7;1,71;1,1n6;1,6b;1,xq;1,-f2r;1,x0f;1,-swl;1,swm;1,-xci;1,b6;1,213;1,1rm;1,1de;1,1h1;1,9l;1,3e;1,16i;1,1s5;1,2jg;1,14o;1,-ed5;1,4d7;1,1ew;1,144;1,40b;1,-azk;1,xuq;1,-sv6;1,bp;1,10p;1,420;1,hl;1,nn;1,-778;1,2a2;1,6tt;1,1b1;1,-eqt;1,j1;1,o;1,28;1,tj;1,2s;1,31;1,10p;1,61;1,5j;1,9k;1,2a;1,m;1,y;1,fl;1,1ge;1,eo;1,s7;1,rp;1,3;1,3k;1,u0;1,h9;1,gc;1,tf;1,1sv;1,75;1,3j;1,dq;1,3h;1,20u;1,-ce6;1,5lr;1,4sg;1,-awm;1,wbp;1,-p3f;1,jl;1,11s;1,-35s;1,j1;1,6;1,q4o;1,-oyc;1,-6tw;1,3a;1,xt;1,5v;1,13;1,62;1,5h;1,fx;1,6l;1,cu;1,90;1,20;1,v;1,7y;1,64;1,1vy;1,da;1,1e8;1,e8;1,2w;1,bg;1f,ab;1,8d;1,pp;1,r4;1,7o;1,13e;1,jr;1,2cp;1,2b;1,-du3;1,2g;1,xs;1,j3;1,114;1,2n;1,7x;1,xs;1,ad;1,be;1,1p0;1,52;1,2e5;1,2kl;1,9s;1,-dhu;1,dt;1,3i;1,u4;1,13b;1,48;1,1b8;1,mv;1,25;1,1nr;1,nf;1,hw;1,1v;1,1v;1,1k;1,bx;1,n2;1,ts;1,3f;1,9f;1,cy;1,1l;1,3q;1,rl;1,cy;1,i1;1,oe;1,id;1,ex;1,b8;1,10o;1,gx;1,-e9y;1,1rd;1,2kj;1,og;1,2t;1,76;1,3xd;1,pb;1,ps;1,6q;1,3h;1,2f4;1,1od;1,-f7q;1,40o;1,zd;1,3qc;1,1uw;1,zz;1,1o6;1,62;1,-9q8;j,1nw;1,v9;1,qrk;1,-vxc;1,ed;1,d5;1,vv;1,5v;1,7q;1,sv;1,1s;1,2iy;1,5s;1,ki;1,12;1,vf;1,yy;1,s;1,6r;1,1tn;1,1de;1,-dbw;1,y4;1,4uo;1,bp;1,2jy;1,8k;1,dz;1,ojj;1,-lhb;1,-b7o;1,g3;1,f6;1,o4;1,2i;1,2;1,cx;1,v2;1,8z;1,41;1,ex;1,hy;1,sp;1,5o;1,87;1,a8;1,3p;1,8e;1,no;1,2x;1,-1;1,3v;1,zc;1,5r;1,23;1,6t;1,p;1,1kj;1,1t;1,4a;1,tp;1,15l;1,2c;1,2c;1,ea;1,11b;1,g1;1,-eow;1,2hh;1,25v;1,182;1,2z2;1,dp;1,2h6;1,e8;1,ll;1,-aes;1,ia;1,174;1,6gj;1,2ak;1,1ol;1,-7dm;1,-4qk;1,zz;1,1d0;1,19c;1,5kx;1,3r;1,123;1,1l7;1,-dsl;1,x15;1,-r33;1,1ml;1,5c8;1,-27a;1,1uv;1,-d0p;1,rt;1,fa;1,65;1,4o;1,aj;1,cl;1,5i;1,83;1,l;1,9x;1,kc;1f,7g;1,1q;1,8t;1,44;1,7u;1,1u;1,xt;1,9d;1,4q;1,6d;1,ew;1,ja;1,76;1,3z;1,3z;1,4r;1,ac;1,8r;1,gv;1,47;1,43;1,cv;1,5y;1,t;1,51;1,8t;1,az;1,eg;1,9r;1,22;1,7k;1,j0;1,ey;1,68;1,q0;1,7e;1,1t;1,6h;1,8a;1,z;1,r6;1,s;1,1;1,1a;1,16;1,7c;1,b2;1,8t;1,1z;1,-e2u;1,x6;1,4b;1,gn;1,27;1,3ki;1,ax;1,g5;1,hu;1,48;1,2bw;1,oo;1,-7j0;1,bq;1,z;1,48;1,14a;1,fa;1,9p;1,6c;1,8m;1,bw;1,5a;1,168;1,m3;1,4u;1,pt;1,cn;1,sv;j,6x;1,84;1,c4;1,33;1,zj;1,2q;1,1c3;1,bb;1,yw;1,by;1,-azs;1,7k7;1,1i5;1,hh;1,-aji;1,w;1,1u;1,4ja;1,2m6;1,157;1,-4nn;1,-2jb;1,5p0;1,1us;1,1o;1,-bpw;1,1m;1,i7;1,dy;1,2y;1,308;1,p4;1,4te;1,1wc;1,2u1;1,-dzl;1,p8;1,m5;1,ph;1,61;1,b8;1,m;1,-1;1,c5;1,7j;1,8i;1,12y;1,36;1,j;1,ak;1,1i;1,27c;1,xy;1,9k;1,1aj;1,y7;1,1l;1,y1;1,5s;1,3;1,3c;1,ac;1,11;1,-adi;1,rk;1,mz;1,9s;1,hq;1,17k;1,i1;1,jq;1,mg;1,21a;1,29v;1,sj;1,py;1,1y9;1,v;1,-ekm;1,21;1,2o;1,wq;1,145;1,bc;1,138;1,vo;1,54;1,2ac;1,mv;1,tn;1,r9;1,t7;1,45;1,c5;1,eq;1,10;1,8l;1,lj;1,wx;1,6o;1,kwm;1,-kvg;1,-as4;1,hf;1,1u;1,wz;1,-ww;1,y;1,qg;1,2im;1f,ru9;1,-rk1;1,ey;1,zz;1,2ol;1,1mv;1,-bw6;1,w1;1,wtu;1,-jh6;1,-8ga;1,-5td;1,86;1,b2;1,ss;1,xz;1,jn;1,10p;1,37s;1,38k;1,6l;1,no;1,9n;1,ck;1,2ea;1,3q;1,ge;1,s6;1,2c;1,-doz;1,x5;1,7e;1,3r;1,il;1,1g;1,jw;1,17l;1,tf;1,6vx;1,gi;1,ze;1,qq;1,o7;1,-df2;1,8f;1,18x;1,na;1,e1;1,2yc;1,685;1,5o;1,5j;1,nf;1,-any;1,7ds;1,qy;1,1dd;1,-cqv;1,1h0;1,8d;1,67;1,1k2;1,33p;1,2p4;1,3ir;1,-c1g;1,1yh;1,36a;1,8d6;1,-fg8;1,20u;1,1cx;1,17w;1,11k;1,2uc;1,6yn;1,-ej7;1,8d;j,lf;1,11v;1,sl;1,14r;1,1cp;1,25a;1,1yp;1,3yy;1,4s;1,-dds;1,2yg;1,7u;1,1zw;1,388;1,n5;1,4jm;1,-8ya;1,40h;1,603;1,2z;1,-fqz;1,d8;1,aj;1,1gm;1,1jx;1,l9;1,116;1,1sa;1,2rg;1,ny6;1,-kh2;1,-9zx;1,uh0;1,1;1,-oky;1,15t;1,ay;1,24;1,8a;1,1pk;1,l4a;1,-xl4;1,xl5;1,1;1,-vpx;1,gv;1,106;1,ox;1,8u;1,2d;1,8b;1,t0i;1,-shc;1,61;1,ko;1,l2;1,a3;1,va;1,1n;1,py;1,59;1,p3f;1,-o35;1,o36;1,-m60;1,m61;1,-lpm;1,17x;1,xp;1,jk1;1,-j1w;1,-d1i;1,1p9;1,17f;1,1tx;1,1dr;1,py;1,3co;1,2z3;1,bx;1,sy;1,-fhk;1,3aq;1,63;1,1ks;1,4l5;1,-9s3;1,1kd;1,1fa;1,3hf;1,4xj;1,6y;1,-9dq;1,8ey;1,-aos;1,8y;1,12w;1,i8;1,21x;1,21c;1,-37z;1,2bn;1,-4pz;1,-la;1,5t;1,xly;1,1;1,1;1,-vlr;1,vls;1f,1;1,-s2s;1,72;1,rvr;1,-q8f;1,v5;1,pdb;1,-nlq;1,1q;1,6s;1,2di;1,u;1,kyx;1,-j1q;1,j1r;1,1;1,1;1,-xr7;1,xr8;1,-vxn;1,1i2;1,1ay;1,t4o;1,1;1,-q1t;1,1qm;1,2k6;1,lr2;1,-kuf;1,21h;1,-ddi;1,aq;1,cx;1,13;1,b9;1,v6i;1,-ujc;1,ujd;1,1;1,-tog;1,-l;1,tp2;1,-sic;1,ne;1,1k;1,5r;1,5;1,2q;1,7z;1,rcu;1,-r03;1,2f;1,z;1,qwq;1,-qts;1,i;1,qtb;1,-pj9;1,w;1,pie;1,-oww;1,ha;1,ofn;1,-odj;1,odk;1,-mdm;1,1aq;1,l2x;1,1;1,1;1,-ke7;1,ke8;1,-iat;1,iau;1,1;1,1;1,-u8p;1,2kg;j,roa;1,-qum;1,qun;1,1;1,-jqo;1,-d1g;1,ws5;1,1;1,1;1,-ssx;1,ssy;1,-r2v;1,4i;1,lc;1,2ti;1,2k;1,nh0;1,-jqj;1,10q;1,pk;1,-b09;1,t0j;1,-que;1,3ns;1,n6n;1,1;1,-vvi;1,vvj;1,1;1,-usz;1,c9;1,ugr;1,-t58;1,32;1,kr;1,1h;1,i2;1,57;1,8z;1,7f;1,49;1,1t;1,k;1,81;1,3z;1,b5;1,qil;1,-qc2;1,qc3;1,-q8q;1,dw;1,p2;1,ud;1,obg;1,1;1,-ngf;1,1gv;1,12m;1,kwz;1,-k89;1,k8a;1,-jh5;1,jh6;1,1;1,-xv6;1,dk;1,xhn;1,-x4d;1,d5;1,3rm;1,12y;1,nx;1,n4;1,vp;1,kj;1,1n0;1,mn;1,11;1,mus;1,-maq;1,b3;1,7u;1,6m;1,ll8;1,-kck;1,kcl;1,-jhh;1,71;1,-eik;1,3d;1,58;1,6h;1,ie;1,6u;1,-b;1,br;1,i0;1,2g;1,4t;1,50;1,cp;1,xn;1,u8q;1,-u0f;1,p8;1,4p;1,2t;1,g3;1,qb;1,nt;1f,7w;1,65;1,bq;1,1m3;1,2a3;1,po;1,3gu;1,k5;1,-d6k;1,37c;1,1c1;1,1x;1,629;1,-70v;1,14q;1,ca;1,ui;1,q4;1,1kl;1,-afe;1,1hh;1,2d8;1,371;1,13;1,9n;1,1u9;1,3bo;1,188;1,hz;1,-8j2;1,1c0;1,14z;1,1;1,1ff;1,z8;1,4f;1,ir;1,-9g2;1,8z;1,f;1,2km;1,2n;1,v7;1,18m;1,2y;1,p;1,vf;1,11u;1,ea;1,8d;1,1p;1,g9;1,1pq;1,1ya;1,df;1,-9pd;1,-1gw;1,1a2;1,b3;1,yp;1,1ep;1,-6zi;1,1xy;1,3fr;1,2h0;1,-63c;1,uu;1,2p;1,47s;1,fe;1,q5n;1,1;1,-xcm;1,7o;1,186;1,72;1,2x;1,1w;j,ej;1,v6f;1,1;1,-uu3;1,111;1,8v;1,3h;1,2z;1,tds;1,-t0i;1,t0j;1,-sc7;1,sc8;1,-qtd;1,h1;1,qcd;1,-p4p;1,13;1,pk;1,n;1,bm;1,a8;1,nrm;1,-mhf;1,b6;1,bj;1,115;1,ktm;1,-ksj;1,1qq;1,-b10;1,1x0;1,g2;1,3aj;1,26e;1,1ak;1,-cm8;1,64;1,6i;1,8g;1,zk;1,5e;1,mo;1,lb;1,i2;1,1n7;1,s7;1,63;1,27;1,ke;1,jy;1,5i;1,4;1,287;1,jp;1,b5;1,1tt;1,13e;1,22;1,k4m;1,-xti;1,5f;1,85;1,50;1,im;1,3;1,14;1,1hw;1,24;1,29;1,za;1,2w;1,vm;1,2g7;1,8s;1,4p;1,hu;1,i6;1,1t;1,14;1,nh;1,jb;1,jy;1,ne;1,3t;1,1us;1,3p;1,4u;1,6t;1,wr;1,2r;1,1;1,-dg3;1,2hd;1,1ae;1,1w;1,e6;1,1t9;1,1qy;1,4gb;1,1ft;1,-eih;1,xtg;1,-sc3;1,98;1,s2;1,e1;1,2vj;1,io;1,ij;1f,260;1,18q;1,2l;1,7d;1,-3q9;1,4d3;1,-f4x;1,6wq;1,7cq;1,-dq9;1,gs;1,8y;1,fm;1,-1;1,41;1,l4;1,15;1,73;1,v9;1,7r;1,j9;1,1ox;1,50;1,8p;1,u;1,ps;1,7j;1,7s;1,2uy;1,14g;1,1c4;1,7v;1,kti;1,-jms;1,dy;1,xv;1,-aoj;1,7lu;1,yc;1,-d8x;1,70;1,45;1,ib;1,po;1,jr;1,19;1,eg;1,12f;1,10g;1,1i5;1,sl;1,ex;1,1wk;1,k4;1,nf;1,2g;1,61;1,f4;1,70;1,59;1,dm;1,11v;1,1h2;1,p0;1,-f6k;1,7y;1,ap;1,2g;1,x99;1,-wig;1,3e;1,15d;1,17;1,k7;1,1;1,1t;1,de;1,1r;j,15;1,1;1,jf;1,ac;1,cx;1,szj;1,-stw;1,6;1,str;1,-siw;1,1;1,nr;1,32;1,rs3;1,-rki;1,rkj;1,-r8q;1,np;1,1;1,ql1;1,-qcw;1,5x;1,q70;1,-pyz;1,pz0;1,1;1,-oiq;1,up;1,fu;1,wt;1,cj;1,1v;1,i;1,n7;1,i;1,eg;1,-c;1,1o;1,5r;1,3k;1,bp;1,k82;1,1;1,-vyg;1,vyh;1,-s1r;1,43a;1,15;1,nxd;1,1;1,-xar;1,1m2;1,jy;1,v4s;1,1;1,-rci;1,ub;1,2m5;1,2eb;1,lhs;1,-khs;1,oo;1,jt5;1,1;1,1;1,1;1,-nz0;1,-60h;1,2ry;1,2mk;1,205;1,mkv;1,-w1o;1,1qh;1,66;1,228;1,64n;1,1j6;1,tt;1,-eag;1,152;1,53g;1,4le;1,3er;1,ar;1,6z;1,-ahk;1,1sd;1,71q;1,-cdw;1,358;1,6b5;1,5kv;1,-fh8;1,3h;1,6e;1,23g;1,12r;1,6o;1,kt;1,t5;1,jk;1,1xo;1,gi;1,1ja;1,jf;1,mj;1,h8;1,2w;1,gp;1f,50;1,18b;1,-d9b;1,2h;1,11;1,xqr;1,1;1,-vqf;1,4x;1,vlj;1,-ust;1,89;1,1s;1,5i;1,udb;1,1;1,1;1,1;1,-qsl;1,br;1,qgv;1,-q5w;1,2l;1,q3c;1,-p9m;1,p9n;1,-o2i;1,13;1,29;1,gt;1,34;1,nfa;1,1;1,-lkb;1,-a;1,r8;1,kte;1,1;1,-j5i;1,o;1,j4v;1,1;1,-r79;1,1ar;1,1s0;1,2;1,1c;1,272;1,-bxc;1,7;1,n6;1,a5;1,wvx;1,-wmo;1,f7;1,m3;1,cq;1,nk;1,54;1,2w1;1,rk0;1,1;1,-olh;1,157;1,ngb;1,-msd;1,sa;1,m04;1,-jgk;1,a;1,jgb;1,1;1,-xyr;1,9m;1,10;1,1vf;1,2jw;1,1q5;j,6mu;1,oo;1,16x;1,-eri;1,1yp;1,4e;1,27;1,19k;1,ucz;1,1;1,-p9d;1,p9e;1,-nfr;1,1v8;1,-bq6;1,db;1,wxf;1,1;1,1;1,-xt8;1,po;1,1rg;1,7sa;1,-a97;1,o6;1,ha;1,10h;1,1i;1,9d;1,7;1,5;1,zr;1,6d;1,2o3;1,cu;1,5x;1,ew;1,a9;1,5a;1,lo;1,ve;1,ka;1,dh;1,8u;1,dr;1,4y;1,10l;1,d5;1,1z9;1,-e40;1,pq;1,qq;1,2y7;1,3h;1,21g;1,1o;1,al;1,2a0;1,y8;1,2wv;1,12s;1,1bm;1,-d1d;1,2nq;1,j5;1,rm;1,1gk;1,-571;1,1zu;1,1ps;1,2ft;1,3a;1,2do;1,2w6;1,-edw;1,5r;1,uh;1,104;1,3r;1,1g;1,3h;1,ij;1,fg;1,29;1,4x;1,uv;1,me;1,4k;1,jt;1,3o;1,2x;1,tv;1,lj;1,qt0;1,-qlm;1,8r;1,191;1,cn;1,y9;1,2v;1,8;1,bn;1,6a;1,53;1,35;1,1n;1,lq;1,ty;1,wp;1,qz;1f,85;1,-dn3;1,n0;1,gv;1,w8;1,1b1;1,zn;1,6l;1,2e;1,14a;1,46;1,bu;1,2p0;1,23k;1,rk;1,h4;1,37m;1,3;1,-8wx;1,1uq;1,30e;1,1n1;1,-deb;1,7;1,dg;1,ni;1,11s;1,xx;1,tc;1,xs;1,e1;1,4p;1,if;1,a4;1,xr;1,29;1,ib;1,16j;1,al;1,14i;1,7m;1,2m;1,bk;1,v8;1,gk;1,d4;1,b6;1,4f;1,17a;1,1ox;1,-f3w;1,87;1,1cn;1,69;1,1p2;1,7x;1,1vj;1,r4;1,qpj;1,-pyv;1,qx;1,5q;1,8i;1,dt;1,bl;1,po;1,1io;1,bj;1,4a;1,3h;1,3i;1,az;1,f;1,34;1,o8;1,-dji;1,1j;1,8p;j,51;1,g;1,5x;1,t;1,16f;1,r;1,6c;1,iw;1,25;1,hy;1,cg;1,b9;1,15v;1,q4;1,21;1,q1;1,bh;1,k2;1,7k;1,8;1,p;1,81;1,yi;1,1r;1,y;1,p;1,jt;1,2cf;1,y8;1,b;1,l2;1,2c;1,3z;1,7d;1,k0;1,9r;1,h;1,4z;1,-e1j;1,36r;1,32;1,24h;1,1sb;1,va;1,6u;1,c6;1,-8ba;1,1um;1,d5;1,3a9;1,ap;1,2cf;1,589;1,vx;1,nk;1,-bp5;1,5x;1,6ws;1,-bcl;1,44;1,o;1,bz;1,p;1,r7;1,12z;1,d3;1,iu;1,31;1,22;1,3u;1,90;1,hh;1,ed;1,1h;1,2g;1,4q;1,2;1,au;1,a2;1,81;1,62;1,65;1,ao;1,14;1,1j;1,1r;1,cg;1,3n;1,kt;1,33;1,8t;1,f5;1,8c;1,7b;1,3h;1,36;1,g1;1,5s;1,xl;1,1iz;1,6g;1,c4;1,wf;1,t;1,3y;1,3y;1,2u;1,2c;1,rq;1,28;1f,6;1,4m;1,1e4;1,-f6g;1,2j;1,kr;1,iw;1,16h;1,76;1,a5;1,n8;1,yn;1,1f4;1,1vy;1,cf;1,1b5;1,rx;1,n7;1,e3;1,ng;1,nd;1,yf;1,1j;1,4i;1,7j;1,1dq;1,-fp8;1,ag;1,3p;1,66;1,p5;1,1r6;1,2f;1,u7;1,83;1,7w;1,2g;1,55;1,-1;1,10;1,ao;1,1m;1,86;1,108;1,2h;1,e1;1,3i;1,1x;1,hs;1,i8;1,f0;1,4;1,3p;1,1t;1,39;1,ea;1,20;1,2t;1,8c;1,ev;1,12s;1,4p;1,q8;1,2z;1,ka;1,6g;1,bj;1,25;1,ae;1,uw;1,4a;1,174;1,-avq;1,4e0;1,3ho;1,174;1,-b57;1,4y;j,-1q0;1,32f;1,37o;1,-6wm;1,29c;1,sn;1,7m;1,57;1,1gq;1,zo;1,191;1,16o;1,lw;1,2i;1,45;1,my;1,2in;1,b;1,11l;1,4a;1,-dl4;1,1kw;1,1au;1,5d;1,w4;1,5kv;1,-9pr;1,7o;1,1s;1,5n;1,1vn;1,7on;1,-8re;1,-2;1,ba;1,nl;1,ga;1,g5;1,70;1,1hf;1,5w;1,5c;1,1l;1,xq;1,22;1,7s;1,8z;1,8a;1,mh;1,br;1,1c5;1,52;1,16;1,3a;1,vx;1,xo;1,o0;1,22;1,kr;1,7u;1,4p;1,72;1,7x;1,4;1,ky;1,13g;1,-63b;1,bw;1,-8uz;1,8n;1,5h;1,16q;1,tj;1,7g;1,1um;1,ro;1,m5;1,8s;1,9i;1,80;1,v7;1,12s;1,2m7;1,1kv;1,2c;1,192;1,ms;1,-4ji;1,-afo;1,5h;1,bbo;1,1vr;1,-cb4;1,4m6;1,-a8;1,k6;1,4s9;1,-8nw;1,1rk;1,12o;1,-sv;1,2r2;1,tw;1,52;1,1or;1,19i;1,1ap;1,cf;1,-ce5;1,13z;1f,5d;1,hx;1,g;1,1p3;1,mi;1,6;1,a0;1,5c;1,55;1,42;1,83;1,m;1,q7;1,72;1,1m;1,ia;1,1q1;1,1s;1,84;1,e;1,qq;1,p5;1,2o;1,6p;1,4q;1,q;1,v5;1,ok;1,m0g;1,-liw;1,56;1,j8;1,-51a;1,md;1,u;1,t9;1,f7;1,-8kw;1,5p;1,ip;1,24a;1,6r;1,fb;1,2;1,f6;1,8e;1,dl;1,bl;1,b0;1,10c;1,4b;1,1l;1,56;1,2m;1,88;1,1p;1,31;1,gr;1,tf;1,k;1,ri;1,ms;1,o8;1,bn;1,if;1,ey;1,5h;1,3m;1,or;1,ja;1,g;1,44;1,-e4j;1,vh;1,16h;1,67;1,nk;1,20l;j,2go;1,6w;1,tn;1,4p;1,1e9;1,11m;1,16l;1,6a;1,f5;1,-8cu;1,ae;1,t0o;1,-w06;1,4m8;1,2va;1,3f6;1,xz;1,k0;1,-avl;1,fx;1,2oi;1,-6ls;1,as;1,3r;1,q2;1,eu;1,1hs;1,3j;1,2lv;1,1v;1,2nb;1,jz;1,oys;1,-l9x;1,3l;1,bo;1,-8x1;1,6t;1,3r6;1,n8;1,4vf;1,9c;1,25n;1,-blm;1,267;1,fr;1,jm;1,1e;1,162;1,9a;1,hc;1,-cw;1,di;1,2ki;1,a8;1,1gz;1,wj;1,1o;1,-e1f;1,1wm;1,1s7;1,g7;1,4ch;1,-8qp;1,k6;1,xi;1,1r3;1,1;1,4h;1,qa;1,46l;1,3ax;1,4;1,-brh;1,o;1,gk;1,jg;1,zv;1,x0;1,40;1,ck;1,tm;1,4u;1,16;1,30;1,mj;1,zb;1,32;1,ro;1,ln;1,vm;1,1ba;1,80;1,al;1,6e;1,-a9z;1,1ff;1,r4;1,14;1,ox;1,u0;1,41x;1,13j;1,17r;1,91;1,2hy;1,1a;1,-cq3;1,4ff;1,3tt;1f,3fa;1,-bmw;1,1kn;1,1du;1,7fc;1,-apl;1,xk3;1,-x4b;1,1ye;1,11f;1,4d;1,55;1,f3;1,4z;1,1t3;1,1g4;1,25m;1,2mu;1,1kv;1,2k;1,-e70;1,v8;1,gl;1,pd;1,xg;1,1d4;1,1l0;1,8h;1,13u;1,1d7;1,1i4;1,p7;1,1fi;1,8c;1,h3;1,a8;1,sa;1,1s;1,bp;1,-dse;1,l6;1,44;1,20j;1,yz;1,25g;1,2ss;1,3fv;1,1a;1,yw;1,-dbg;1,28d;1,3ag;1,8t;1,1eo;1,io;1,w2;1,13;1,2s5;1,21;1,-a04;1,bk;1,uw;1,129;1,2xn;1,mw;1,dd;1,3u9;1,dc;1,gm;1,-9i7;1,1hd;1,1hg;1,3np;1,n8;1,1e2;1,2h2;1,w5;1,ilm;j,-x4t;1,43g;1,1au;1,9m;1,2y9;1,2km;1,11k;1,1c;1,22e;1,-ed3;1,2q;1,h5;1,2i4;1,6o;1,2f;1,153;1,34;1,20;1,63;1,199;1,44;1,1fb;1,4k;1,d;1,5g;1,1n;1,1ah;1,de;1,2l;1,38;1,e8;1,1fd;1,77;1,rh;1,15;1,z;1,-d0r;1,1e6;1,5cs;1,162;1,2zt;1,l4;1,-934;1,ri;1,1h7;1,85z;1,-c06;1,vs;1,pn;1,xb;1,65;1,kf;1,53x;1,fn;1,xh;1,2n2;1,-91x;1,-3ya;1,2g8;1,1yk;1,-2uc;1,201;1,6j;1,12e;1,2y;1,4m;1,ul;1,1n3;1,lt;1,1rk;1,a6;1,1ba;1,k9;1,gl;1,7p;1,1l;1,29;1,ac;1,8;1,3m;1,n5;1,nv;1,d3;1,-fek;1,7rf;1,sh;1,bh;1,2f;1,3c;1,h1;1,1au;1,1w5;1,r;1,3o;1,7s;1,-8a3;1,m2;1,26c;1,-6rt;1,46s;1,azy;1,-fbr;1,2vv;1,2ie;1,5ek;1,2z;1,q;1,-7ur;1,6ip;1,ge;1f,1s2;1,-ban;1,2r;1,e3;1,si;1,e3;1,40p;1,312;1,3e;1,4s;1,6f;1,2ba;1,rq;1,1qu;1,pf;1,-fb2;1,-c0;1,yk;1,2mz;1,2lt;1,-3ig;1,-2jg;1,4c;1,14w;1,1dh;1,au;1,ee;1,1m7;1,tj;1,7d;1,sa;1,t2;1,w;1,31;1,qh;1,1b;1,ou;1,1g;1,ab;1,hy;1,xh;1,1o3;1,1il;1,kq;1,13z;1,-f7v;1,3i;1,duw;1,-30j;1,-bs7;1,53j;1,1f8;1,-66p;1,2el;1,2b7;1,z7;1,6o;1,1b7;1,ss;1,52u;1,bj;1,-2bc;1,-2qo;1,25;1,-56u;1,-3dh;1,15a;1,4a;1,og;1,6v;1,1fv;1,9v;1,3n;1,v4;1,f3;1,4ww;1,3yj;1,oh;j,18;1,-ek1;1,mf;1,dt;1,fs;1,w3p;1,-tyh;1,tyi;1,-tgg;1,ax;1,aa;1,1k4;1,1a;1,tv;1,m;1,4bj;1,201;1,-cmf;1,c5;1,9s;1,1k2;1,gi;1,1x0;1,zu;1,2d;1,2ku;1,2je;1,-9pn;1,7up;1,-5u1;1,3ty;1,1th;1,2gd;1,-ac6;1,2c9;1,13i;1,-2sm;1,ho;1,38e;1,rkk;1,-n16;1,-aal;1,is;1,116;1,1di;1,8b;1,20r;1,6i;1,3k;1,2su;1,14g;1,ee;1,25u;1,kq;1,1kx;1,j83;1,-th9;1,259;1,-26r;1,37;1,-3w6;1,jm;1,lr;1,a27;1,-81b;1,1ef;1,sr3;1,-q3u;1,12v;1,f3;1,3op;1,-b2s;1,3ie;1,4oj;1,1ij;1,1cm;1,1mh;1,-e69;1,1r3;1,2d;1,1rd;1,8ze;1,26z;1,-bf1;1,3do;1,6zh;1,-cc5;1,kl;1,q6;1,wm;1,f7;1,25;1,hp;1,12j;1,2k;1,z2;1,ei;1,se;1,1fn;1,mu;1,27i;1,20s;1,-dtf;1,10e;1,37h;1,24p;1,ij;1,4p2;1,l9;1,h7;1f,t5;1,-dkv;1,hu;1,31b;1,-3xf;1,13v;1,2aa;1,xt;1,1fo;1,6c;1,y5;1,4x;1,1ei;1,31s;1,ly;1,-8xc;1,36p;1,a3;1,3an;1,-6fu;1,-3f3;1,40;1,3jm;1,35y;1,1vk;1,f5;1,e9;1,38k;1,1gg;1,h8;1,-2n7;1,-aj0;1,1e1;1,1tp;1,5lp;1,18o;1,-aph;1,1di;1,nh;1,3j;1,14;1,1a1;1,5dj;1,w3;1,37w;1,5u;1,-e1f;1,ql;1,8;1,2;1,af;1,38;1,eh;1,1ds;1,er;1,hx;1,m;1,4k;1,trl;1,-rvp;1,3p;1,1mz;1,ht;1,1po;1,29;1,bz;1,ar;1,29;1,rf;1,3p;1,1dl;1,kf;1,177;1,ic;1,-c3w;1,1nz;1,15;1,1tg;j,dx;1,qv5;1,-xle;1,i0;1,2jx;1,dl;1,16o;1,jq;1,yx;1,15s;1,w6;1,2yo;1,sx;1,2fi;1,-3;1,an;1,-dqa;1,7dq;1,-3bg;1,6n8;1,9f;1,2fy;1,7a;1,-bhu;1,mn;1,3rb;1,70;1,3jx;1,1jo;1,14z;1,-d8p;1,2df;1,3t;1,2kn;1,1ds;1,ba;1,15;1,14r;1,1iw;1,4gv;1,-evi;1,d0t;1,-d2p;1,96;1,up;1,12h;1,14p;1,1go;1,1ab;1,1ia;1,2zm;1,rz;1,122;1,pc;1,1ce;1,zb;1,-dac;1,iv;1,8go;1,xw;1,3og;1,-d0i;1,wm;1,11;1,12c;1,19i;1,jv;1,3l;1,3b;1,30b;1,4b;1,49t;1,1;1,5a;1,ar;1,-dpd;1,c0i;1,-c3r;1,fi;1,3x;1,4r;1,13;1,46p;1,l6;1,36r;1,we;1,37a;1,rf;1,1ky;1,-epd;1,5c;1,6q2;1,36a;1,2ww;1,1c;1,3s;1,-e62;1,2v;1,25h;1,6w;1,lt;1,gr;1,g5;1,ye;1,5w;1,ud;1,bt;1,3d5;1,9v;1,b3;1f,noe;1,1;1,-jd0;1,-ehs;1,c0;1,v2;1,kg;1,cn;1,en;1,22;1,179;1,1in;1,sg;1,j0;1,4pi;1,dm;1,3z;1,39;1,13v;1,1uz;1,5n;1,-e7u;1,48q;1,-4rm;1,2ua;1,1qv;1,5iw;1,zp;1,-bdt;1,12e;1,il;1,5rs;1,5rj;1,1d6;1,7e;1,26;1,1u;1,-dae;1,gc;1,918;1,ra;1,-7zz;1,1tw;1,1ol;1,5ef;1,-70r;1,8kj;1,q5;1,-cua;1,4vf;1,5ez;1,1z2;1,-e51;1,2lc;1,fm;1,k2;1,v7;1,1ao;1,qo;1,k9;1,1h;1,1x;1,mj;1,10;1,16e;1,v;1,5d;1,t0;1,17f;1,mgo;1,-lk8;1,12f;1,17q;1,-c2m;1,65f;1,2q4;1,341;1,-c39;j,-25o;1,ok;1,162;1,qn;1,18h;1,20r;1,134;1,2rw;1,2;1,ij;1,2zx;1,129;1,-eiw;1,ik;1,5p;1,12y;1,1jr;1,2n4;1,ek;1,8n;1,23;1,2n;1,6b;1,gn;1,3k;1,2xt;1,uw;1,5b;1,1if;1,4a;1,ld;1,16t;1,-e9m;1,2qx;1,ax;1,3r;1,11o;1,61y;1,1rl;1,o5;1,15o;1,-egt;1,1w;1,162;1,ux;1,11;1,3n;1,mw;1,he;1,lr;1,i;1,qq;1,2l;1,138;1,am;1,2u;1,3r;1,4i;1,4c;1,24;1,9;1,38;1,hf;1,9h;1,1h;1,3q;1,c3;1,jt;1,oe;1,9g;1,jn;1,cl;1,cl;1,2c;1,b3;1,h;1,7p;1,sj;1,6r;1,1fm;1,us;1,2t;1,-az8;1,91;1,9cx;1,-avx;1,2b9;1,1k8;1,1z;1,16p;1,7pf;1,-bph;1,65;1,56d;1,-7kb;1,21g;1,2me;1,39;1,2f;1,q6;1,2el;1,1v8;1,pf;1,3sf;1,-en9;1,ae;1,1a1;1,305;1,181;1,zu;1f,t4;1,1d;1,1rn;1,8u;1,1aa;1,5s;1,9z;1,24s;1,jh3;1,-tg7;1,1j;1,3v3;1,1;1,c0;1,-8qb;1,1gi;1,qe;1,gm;1,k5;1,fc;1,mw;1,1hi;1,-zg;1,dq;1,152;1,ng;1,nf;1,1nc;1,3uk;1,1yd;1,cc;1,-99m;1,ba;1,vh;1,4xv;1,1vt;1,-dei;1,2fw;1,9o;1,4l;1,4p;1,1m;1,s;1,zb;1,1;1,o1;1,m4;1,bi;1,2y;1,49;1,dm;1,nk;1,dn;1,116;1,2u;1,1ez;1,sl;1,1ru;1,18c;1,1me;1,-exg;1,q7;1,1lp;1,3z;1,60;1,1e;1,9v;1,vj;1,4d;1,pl;1,nm;1,cg;1,5e;1,l6;1,268;1,no;1,ae;1,ps;j,r8;1,f0;1,-bi9;1,6i7;1,-4po;1,2xh;1,87t;1,-cgm;1,bc;1,yf;1,1yj;1,1p;1,90;1,d2;1,z2;1,1l;1,vp;1,2ux;1,3b5;1,1qw;1,-eqm;1,2y;1,ox;1,38;1,1a;1,99;1,1o;1,1oa;1,99;1,1ip;1,209;1,hj;1,5k8;1,-c2y;1,o;1,12p;1,2y;1,4s6;1,3v;1,30;1,3w5;1,v7;1,-70r;1,65c;1,-9hd;1,3bx;1,24m;1,3qf;1,-9ns;1,gg;1,4dk;1,-2g8;1,2s;1,tt;1,ij;1,24e;1,52i;1,to;1,335;1,-fql;1,46h;1,2hd;1,wr;1,3cx;1,-7ib;1,8h6;1,3oq;1,-f5d;1,4v;1,7m;1,566;1,3wi;1,5w9;1,-b7g;1,zy;1,12t;1,119;1,-6oi;1,1o6;1,6fi;1,2kv;1,-646;1,t;1,9;1,-4jy;1,2ew;1,2j1;1,3o8;1,fn;1,-9pu;1,7c;1,qm;1,5r;1,2q;1,m7;1,7x;1,lf;1,p9;1,-1;1,49;1,tp;1,3s;1,243;1,w;1,1;1,6l;1,1ds;1,2h;1,14i;1,24e"
}, ye = {
	CP932: "4h,1eg1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1;1,1",
	BIG5: "",
	GB2312: "",
	CP949: "",
	JOHAB: ""
}, be = {
	1: "CP932",
	2: "BIG5",
	3: "CP949",
	4: "JOHAB",
	5: "GB2312"
}, xe = /* @__PURE__ */ new Map(), R = (e) => {
	let t = xe.get(e);
	if (t) return t;
	let n = /* @__PURE__ */ new Map(), r = ve[e] ?? "", i = 0, a = 0;
	if (r) for (let e of r.split(";")) {
		let t = e.indexOf(",");
		i += parseInt(e.slice(0, t), 36), a += parseInt(e.slice(t + 1), 36), n.set(i, a);
	}
	return xe.set(e, n), n;
}, Se = (e, t) => {
	let n = be[e];
	if (!n) return String.fromCharCode(t);
	let r = R(n), i = r.get(t) ?? r.get(t & 32639);
	return String.fromCharCode(i ?? t);
}, Ce = [
	8364,
	129,
	8218,
	402,
	8222,
	8230,
	8224,
	8225,
	710,
	8240,
	352,
	8249,
	338,
	141,
	381,
	143,
	144,
	8216,
	8217,
	8220,
	8221,
	8226,
	8211,
	8212,
	732,
	8482,
	353,
	8250,
	339,
	157,
	382,
	376
], we = (e) => {
	let t = String(e ?? "");
	return t.indexOf("%%") === -1 && t.indexOf("\\U+") === -1 && t.indexOf("\\u+") === -1 && t.indexOf("\\M+") === -1 ? L(t) : L(t.replace(/\\M\+([1-5])([0-9A-Fa-f]{4})/g, (e, t, n) => Se(Number(t), parseInt(n, 16))).replace(/\\[Uu]\+([0-9A-Fa-f]{4})/g, (e, t) => String.fromCharCode(parseInt(t, 16))).replace(/%%(%|\d{1,3}|[A-Za-z])/g, (e, t) => {
		if (t === "%") return "%";
		if (t >= "0" && t <= "9") {
			let e = parseInt(t, 10);
			return e >= 32 && e <= 255 ? e >= 128 && e <= 159 ? String.fromCharCode(Ce[e - 128]) : String.fromCharCode(e) : "";
		}
		let n = t.toLowerCase();
		return n === "d" ? "°" : n === "c" ? "Ø" : n === "p" ? "±" : n === "u" || n === "o" ? "" : e;
	}));
}, Te = (e) => String(e ?? "").replace(/°/g, "%%d").replace(/Ø/g, "%%c").replace(/±/g, "%%p"), Ee = (e) => {
	let t = "";
	for (let n = 0; n < e.length; n++) {
		let r = e.charCodeAt(n);
		t += r > 126 ? "\\U+" + r.toString(16).toUpperCase().padStart(4, "0") : e[n];
	}
	return t;
}, De = {
	ANSI_1250: [
		8364,
		65533,
		8218,
		65533,
		8222,
		8230,
		8224,
		8225,
		65533,
		8240,
		352,
		8249,
		346,
		356,
		381,
		377,
		65533,
		8216,
		8217,
		8220,
		8221,
		8226,
		8211,
		8212,
		65533,
		8482,
		353,
		8250,
		347,
		357,
		382,
		378,
		160,
		711,
		728,
		321,
		164,
		260,
		166,
		167,
		168,
		169,
		350,
		171,
		172,
		173,
		174,
		379,
		176,
		177,
		731,
		322,
		180,
		181,
		182,
		183,
		184,
		261,
		351,
		187,
		317,
		733,
		318,
		380,
		340,
		193,
		194,
		258,
		196,
		313,
		262,
		199,
		268,
		201,
		280,
		203,
		282,
		205,
		206,
		270,
		272,
		323,
		327,
		211,
		212,
		336,
		214,
		215,
		344,
		366,
		218,
		368,
		220,
		221,
		354,
		223,
		341,
		225,
		226,
		259,
		228,
		314,
		263,
		231,
		269,
		233,
		281,
		235,
		283,
		237,
		238,
		271,
		273,
		324,
		328,
		243,
		244,
		337,
		246,
		247,
		345,
		367,
		250,
		369,
		252,
		253,
		355,
		729
	],
	ANSI_1251: [
		1026,
		1027,
		8218,
		1107,
		8222,
		8230,
		8224,
		8225,
		8364,
		8240,
		1033,
		8249,
		1034,
		1036,
		1035,
		1039,
		1106,
		8216,
		8217,
		8220,
		8221,
		8226,
		8211,
		8212,
		65533,
		8482,
		1113,
		8250,
		1114,
		1116,
		1115,
		1119,
		160,
		1038,
		1118,
		1032,
		164,
		1168,
		166,
		167,
		1025,
		169,
		1028,
		171,
		172,
		173,
		174,
		1031,
		176,
		177,
		1030,
		1110,
		1169,
		181,
		182,
		183,
		1105,
		8470,
		1108,
		187,
		1112,
		1029,
		1109,
		1111,
		1040,
		1041,
		1042,
		1043,
		1044,
		1045,
		1046,
		1047,
		1048,
		1049,
		1050,
		1051,
		1052,
		1053,
		1054,
		1055,
		1056,
		1057,
		1058,
		1059,
		1060,
		1061,
		1062,
		1063,
		1064,
		1065,
		1066,
		1067,
		1068,
		1069,
		1070,
		1071,
		1072,
		1073,
		1074,
		1075,
		1076,
		1077,
		1078,
		1079,
		1080,
		1081,
		1082,
		1083,
		1084,
		1085,
		1086,
		1087,
		1088,
		1089,
		1090,
		1091,
		1092,
		1093,
		1094,
		1095,
		1096,
		1097,
		1098,
		1099,
		1100,
		1101,
		1102,
		1103
	],
	ANSI_1253: [
		8364,
		65533,
		8218,
		402,
		8222,
		8230,
		8224,
		8225,
		65533,
		8240,
		65533,
		8249,
		65533,
		65533,
		65533,
		65533,
		65533,
		8216,
		8217,
		8220,
		8221,
		8226,
		8211,
		8212,
		65533,
		8482,
		65533,
		8250,
		65533,
		65533,
		65533,
		65533,
		160,
		901,
		902,
		163,
		164,
		165,
		166,
		167,
		168,
		169,
		65533,
		171,
		172,
		173,
		174,
		8213,
		176,
		177,
		178,
		179,
		900,
		181,
		182,
		183,
		904,
		905,
		906,
		187,
		908,
		189,
		910,
		911,
		912,
		913,
		914,
		915,
		916,
		917,
		918,
		919,
		920,
		921,
		922,
		923,
		924,
		925,
		926,
		927,
		928,
		929,
		65533,
		931,
		932,
		933,
		934,
		935,
		936,
		937,
		938,
		939,
		940,
		941,
		942,
		943,
		944,
		945,
		946,
		947,
		948,
		949,
		950,
		951,
		952,
		953,
		954,
		955,
		956,
		957,
		958,
		959,
		960,
		961,
		962,
		963,
		964,
		965,
		966,
		967,
		968,
		969,
		970,
		971,
		972,
		973,
		974,
		65533
	],
	ANSI_1254: [
		8364,
		65533,
		8218,
		402,
		8222,
		8230,
		8224,
		8225,
		710,
		8240,
		352,
		8249,
		338,
		65533,
		65533,
		65533,
		65533,
		8216,
		8217,
		8220,
		8221,
		8226,
		8211,
		8212,
		732,
		8482,
		353,
		8250,
		339,
		65533,
		65533,
		376,
		160,
		161,
		162,
		163,
		164,
		165,
		166,
		167,
		168,
		169,
		170,
		171,
		172,
		173,
		174,
		175,
		176,
		177,
		178,
		179,
		180,
		181,
		182,
		183,
		184,
		185,
		186,
		187,
		188,
		189,
		190,
		191,
		192,
		193,
		194,
		195,
		196,
		197,
		198,
		199,
		200,
		201,
		202,
		203,
		204,
		205,
		206,
		207,
		286,
		209,
		210,
		211,
		212,
		213,
		214,
		215,
		216,
		217,
		218,
		219,
		220,
		304,
		350,
		223,
		224,
		225,
		226,
		227,
		228,
		229,
		230,
		231,
		232,
		233,
		234,
		235,
		236,
		237,
		238,
		239,
		287,
		241,
		242,
		243,
		244,
		245,
		246,
		247,
		248,
		249,
		250,
		251,
		252,
		305,
		351,
		255
	],
	ANSI_1255: [
		8364,
		65533,
		8218,
		402,
		8222,
		8230,
		8224,
		8225,
		710,
		8240,
		65533,
		8249,
		65533,
		65533,
		65533,
		65533,
		65533,
		8216,
		8217,
		8220,
		8221,
		8226,
		8211,
		8212,
		732,
		8482,
		65533,
		8250,
		65533,
		65533,
		65533,
		65533,
		160,
		161,
		162,
		163,
		8362,
		165,
		166,
		167,
		168,
		169,
		215,
		171,
		172,
		173,
		174,
		175,
		176,
		177,
		178,
		179,
		180,
		181,
		182,
		183,
		184,
		185,
		247,
		187,
		188,
		189,
		190,
		191,
		1456,
		1457,
		1458,
		1459,
		1460,
		1461,
		1462,
		1463,
		1464,
		1465,
		65533,
		1467,
		1468,
		1469,
		1470,
		1471,
		1472,
		1473,
		1474,
		1475,
		1520,
		1521,
		1522,
		1523,
		1524,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		1488,
		1489,
		1490,
		1491,
		1492,
		1493,
		1494,
		1495,
		1496,
		1497,
		1498,
		1499,
		1500,
		1501,
		1502,
		1503,
		1504,
		1505,
		1506,
		1507,
		1508,
		1509,
		1510,
		1511,
		1512,
		1513,
		1514,
		65533,
		65533,
		8206,
		8207,
		65533
	],
	ANSI_1257: [
		8364,
		65533,
		8218,
		65533,
		8222,
		8230,
		8224,
		8225,
		65533,
		8240,
		65533,
		8249,
		65533,
		168,
		711,
		184,
		65533,
		8216,
		8217,
		8220,
		8221,
		8226,
		8211,
		8212,
		65533,
		8482,
		65533,
		8250,
		65533,
		175,
		731,
		65533,
		160,
		65533,
		162,
		163,
		164,
		65533,
		166,
		167,
		216,
		169,
		342,
		171,
		172,
		173,
		174,
		198,
		176,
		177,
		178,
		179,
		180,
		181,
		182,
		183,
		248,
		185,
		343,
		187,
		188,
		189,
		190,
		230,
		260,
		302,
		256,
		262,
		196,
		197,
		280,
		274,
		268,
		201,
		377,
		278,
		290,
		310,
		298,
		315,
		352,
		323,
		325,
		211,
		332,
		213,
		214,
		215,
		370,
		321,
		346,
		362,
		220,
		379,
		381,
		223,
		261,
		303,
		257,
		263,
		228,
		229,
		281,
		275,
		269,
		233,
		378,
		279,
		291,
		311,
		299,
		316,
		353,
		324,
		326,
		243,
		333,
		245,
		246,
		247,
		371,
		322,
		347,
		363,
		252,
		380,
		382,
		729
	],
	ANSI_1258: [
		8364,
		65533,
		8218,
		402,
		8222,
		8230,
		8224,
		8225,
		710,
		8240,
		65533,
		8249,
		338,
		65533,
		65533,
		65533,
		65533,
		8216,
		8217,
		8220,
		8221,
		8226,
		8211,
		8212,
		732,
		8482,
		65533,
		8250,
		339,
		65533,
		65533,
		376,
		160,
		161,
		162,
		163,
		164,
		165,
		166,
		167,
		168,
		169,
		170,
		171,
		172,
		173,
		174,
		175,
		176,
		177,
		178,
		179,
		180,
		181,
		182,
		183,
		184,
		185,
		186,
		187,
		188,
		189,
		190,
		191,
		192,
		193,
		194,
		258,
		196,
		197,
		198,
		199,
		200,
		201,
		202,
		203,
		768,
		205,
		206,
		207,
		272,
		209,
		777,
		211,
		212,
		416,
		214,
		215,
		216,
		217,
		218,
		219,
		220,
		431,
		771,
		223,
		224,
		225,
		226,
		259,
		228,
		229,
		230,
		231,
		232,
		233,
		234,
		235,
		769,
		237,
		238,
		239,
		273,
		241,
		803,
		243,
		244,
		417,
		246,
		247,
		248,
		249,
		250,
		251,
		252,
		432,
		8363,
		255
	],
	ANSI_874: [
		8364,
		65533,
		65533,
		65533,
		65533,
		8230,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		8216,
		8217,
		8220,
		8221,
		8226,
		8211,
		8212,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		160,
		3585,
		3586,
		3587,
		3588,
		3589,
		3590,
		3591,
		3592,
		3593,
		3594,
		3595,
		3596,
		3597,
		3598,
		3599,
		3600,
		3601,
		3602,
		3603,
		3604,
		3605,
		3606,
		3607,
		3608,
		3609,
		3610,
		3611,
		3612,
		3613,
		3614,
		3615,
		3616,
		3617,
		3618,
		3619,
		3620,
		3621,
		3622,
		3623,
		3624,
		3625,
		3626,
		3627,
		3628,
		3629,
		3630,
		3631,
		3632,
		3633,
		3634,
		3635,
		3636,
		3637,
		3638,
		3639,
		3640,
		3641,
		3642,
		65533,
		65533,
		65533,
		65533,
		3647,
		3648,
		3649,
		3650,
		3651,
		3652,
		3653,
		3654,
		3655,
		3656,
		3657,
		3658,
		3659,
		3660,
		3661,
		3662,
		3663,
		3664,
		3665,
		3666,
		3667,
		3668,
		3669,
		3670,
		3671,
		3672,
		3673,
		3674,
		3675,
		65533,
		65533,
		65533,
		65533
	],
	ISO8859_2: [
		128,
		129,
		130,
		131,
		132,
		133,
		134,
		135,
		136,
		137,
		138,
		139,
		140,
		141,
		142,
		143,
		144,
		145,
		146,
		147,
		148,
		149,
		150,
		151,
		152,
		153,
		154,
		155,
		156,
		157,
		158,
		159,
		160,
		260,
		728,
		321,
		164,
		317,
		346,
		167,
		168,
		352,
		350,
		356,
		377,
		173,
		381,
		379,
		176,
		261,
		731,
		322,
		180,
		318,
		347,
		711,
		184,
		353,
		351,
		357,
		378,
		733,
		382,
		380,
		340,
		193,
		194,
		258,
		196,
		313,
		262,
		199,
		268,
		201,
		280,
		203,
		282,
		205,
		206,
		270,
		272,
		323,
		327,
		211,
		212,
		336,
		214,
		215,
		344,
		366,
		218,
		368,
		220,
		221,
		354,
		223,
		341,
		225,
		226,
		259,
		228,
		314,
		263,
		231,
		269,
		233,
		281,
		235,
		283,
		237,
		238,
		271,
		273,
		324,
		328,
		243,
		244,
		337,
		246,
		247,
		345,
		367,
		250,
		369,
		252,
		253,
		355,
		729
	],
	ISO8859_3: [
		128,
		129,
		130,
		131,
		132,
		133,
		134,
		135,
		136,
		137,
		138,
		139,
		140,
		141,
		142,
		143,
		144,
		145,
		146,
		147,
		148,
		149,
		150,
		151,
		152,
		153,
		154,
		155,
		156,
		157,
		158,
		159,
		160,
		294,
		728,
		163,
		164,
		65533,
		292,
		167,
		168,
		304,
		350,
		286,
		308,
		173,
		65533,
		379,
		176,
		295,
		178,
		179,
		180,
		181,
		293,
		183,
		184,
		305,
		351,
		287,
		309,
		189,
		65533,
		380,
		192,
		193,
		194,
		65533,
		196,
		266,
		264,
		199,
		200,
		201,
		202,
		203,
		204,
		205,
		206,
		207,
		65533,
		209,
		210,
		211,
		212,
		288,
		214,
		215,
		284,
		217,
		218,
		219,
		220,
		364,
		348,
		223,
		224,
		225,
		226,
		65533,
		228,
		267,
		265,
		231,
		232,
		233,
		234,
		235,
		236,
		237,
		238,
		239,
		65533,
		241,
		242,
		243,
		244,
		289,
		246,
		247,
		285,
		249,
		250,
		251,
		252,
		365,
		349,
		729
	],
	ISO8859_4: [
		128,
		129,
		130,
		131,
		132,
		133,
		134,
		135,
		136,
		137,
		138,
		139,
		140,
		141,
		142,
		143,
		144,
		145,
		146,
		147,
		148,
		149,
		150,
		151,
		152,
		153,
		154,
		155,
		156,
		157,
		158,
		159,
		160,
		260,
		312,
		342,
		164,
		296,
		315,
		167,
		168,
		352,
		274,
		290,
		358,
		173,
		381,
		175,
		176,
		261,
		731,
		343,
		180,
		297,
		316,
		711,
		184,
		353,
		275,
		291,
		359,
		330,
		382,
		331,
		256,
		193,
		194,
		195,
		196,
		197,
		198,
		302,
		268,
		201,
		280,
		203,
		278,
		205,
		206,
		298,
		272,
		325,
		332,
		310,
		212,
		213,
		214,
		215,
		216,
		370,
		218,
		219,
		220,
		360,
		362,
		223,
		257,
		225,
		226,
		227,
		228,
		229,
		230,
		303,
		269,
		233,
		281,
		235,
		279,
		237,
		238,
		299,
		273,
		326,
		333,
		311,
		244,
		245,
		246,
		247,
		248,
		371,
		250,
		251,
		252,
		361,
		363,
		729
	],
	ISO8859_5: [
		128,
		129,
		130,
		131,
		132,
		133,
		134,
		135,
		136,
		137,
		138,
		139,
		140,
		141,
		142,
		143,
		144,
		145,
		146,
		147,
		148,
		149,
		150,
		151,
		152,
		153,
		154,
		155,
		156,
		157,
		158,
		159,
		160,
		1025,
		1026,
		1027,
		1028,
		1029,
		1030,
		1031,
		1032,
		1033,
		1034,
		1035,
		1036,
		173,
		1038,
		1039,
		1040,
		1041,
		1042,
		1043,
		1044,
		1045,
		1046,
		1047,
		1048,
		1049,
		1050,
		1051,
		1052,
		1053,
		1054,
		1055,
		1056,
		1057,
		1058,
		1059,
		1060,
		1061,
		1062,
		1063,
		1064,
		1065,
		1066,
		1067,
		1068,
		1069,
		1070,
		1071,
		1072,
		1073,
		1074,
		1075,
		1076,
		1077,
		1078,
		1079,
		1080,
		1081,
		1082,
		1083,
		1084,
		1085,
		1086,
		1087,
		1088,
		1089,
		1090,
		1091,
		1092,
		1093,
		1094,
		1095,
		1096,
		1097,
		1098,
		1099,
		1100,
		1101,
		1102,
		1103,
		8470,
		1105,
		1106,
		1107,
		1108,
		1109,
		1110,
		1111,
		1112,
		1113,
		1114,
		1115,
		1116,
		167,
		1118,
		1119
	],
	ISO8859_6: [
		128,
		129,
		130,
		131,
		132,
		133,
		134,
		135,
		136,
		137,
		138,
		139,
		140,
		141,
		142,
		143,
		144,
		145,
		146,
		147,
		148,
		149,
		150,
		151,
		152,
		153,
		154,
		155,
		156,
		157,
		158,
		159,
		160,
		65533,
		65533,
		65533,
		164,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		1548,
		173,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		1563,
		65533,
		65533,
		65533,
		1567,
		65533,
		1569,
		1570,
		1571,
		1572,
		1573,
		1574,
		1575,
		1576,
		1577,
		1578,
		1579,
		1580,
		1581,
		1582,
		1583,
		1584,
		1585,
		1586,
		1587,
		1588,
		1589,
		1590,
		1591,
		1592,
		1593,
		1594,
		65533,
		65533,
		65533,
		65533,
		65533,
		1600,
		1601,
		1602,
		1603,
		1604,
		1605,
		1606,
		1607,
		1608,
		1609,
		1610,
		1611,
		1612,
		1613,
		1614,
		1615,
		1616,
		1617,
		1618,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533
	],
	ISO8859_7: [
		128,
		129,
		130,
		131,
		132,
		133,
		134,
		135,
		136,
		137,
		138,
		139,
		140,
		141,
		142,
		143,
		144,
		145,
		146,
		147,
		148,
		149,
		150,
		151,
		152,
		153,
		154,
		155,
		156,
		157,
		158,
		159,
		160,
		8216,
		8217,
		163,
		8364,
		8367,
		166,
		167,
		168,
		169,
		890,
		171,
		172,
		173,
		65533,
		8213,
		176,
		177,
		178,
		179,
		900,
		901,
		902,
		183,
		904,
		905,
		906,
		187,
		908,
		189,
		910,
		911,
		912,
		913,
		914,
		915,
		916,
		917,
		918,
		919,
		920,
		921,
		922,
		923,
		924,
		925,
		926,
		927,
		928,
		929,
		65533,
		931,
		932,
		933,
		934,
		935,
		936,
		937,
		938,
		939,
		940,
		941,
		942,
		943,
		944,
		945,
		946,
		947,
		948,
		949,
		950,
		951,
		952,
		953,
		954,
		955,
		956,
		957,
		958,
		959,
		960,
		961,
		962,
		963,
		964,
		965,
		966,
		967,
		968,
		969,
		970,
		971,
		972,
		973,
		974,
		65533
	],
	ISO8859_8: [
		128,
		129,
		130,
		131,
		132,
		133,
		134,
		135,
		136,
		137,
		138,
		139,
		140,
		141,
		142,
		143,
		144,
		145,
		146,
		147,
		148,
		149,
		150,
		151,
		152,
		153,
		154,
		155,
		156,
		157,
		158,
		159,
		160,
		65533,
		162,
		163,
		164,
		165,
		166,
		167,
		168,
		169,
		215,
		171,
		172,
		173,
		174,
		175,
		176,
		177,
		178,
		179,
		180,
		181,
		182,
		183,
		184,
		185,
		247,
		187,
		188,
		189,
		190,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		8215,
		1488,
		1489,
		1490,
		1491,
		1492,
		1493,
		1494,
		1495,
		1496,
		1497,
		1498,
		1499,
		1500,
		1501,
		1502,
		1503,
		1504,
		1505,
		1506,
		1507,
		1508,
		1509,
		1510,
		1511,
		1512,
		1513,
		1514,
		65533,
		65533,
		8206,
		8207,
		65533
	],
	ISO8859_9: [
		128,
		129,
		130,
		131,
		132,
		133,
		134,
		135,
		136,
		137,
		138,
		139,
		140,
		141,
		142,
		143,
		144,
		145,
		146,
		147,
		148,
		149,
		150,
		151,
		152,
		153,
		154,
		155,
		156,
		157,
		158,
		159,
		160,
		161,
		162,
		163,
		164,
		165,
		166,
		167,
		168,
		169,
		170,
		171,
		172,
		173,
		174,
		175,
		176,
		177,
		178,
		179,
		180,
		181,
		182,
		183,
		184,
		185,
		186,
		187,
		188,
		189,
		190,
		191,
		192,
		193,
		194,
		195,
		196,
		197,
		198,
		199,
		200,
		201,
		202,
		203,
		204,
		205,
		206,
		207,
		286,
		209,
		210,
		211,
		212,
		213,
		214,
		215,
		216,
		217,
		218,
		219,
		220,
		304,
		350,
		223,
		224,
		225,
		226,
		227,
		228,
		229,
		230,
		231,
		232,
		233,
		234,
		235,
		236,
		237,
		238,
		239,
		287,
		241,
		242,
		243,
		244,
		245,
		246,
		247,
		248,
		249,
		250,
		251,
		252,
		305,
		351,
		255
	],
	CP437: [
		199,
		252,
		233,
		226,
		228,
		224,
		229,
		231,
		234,
		235,
		232,
		239,
		238,
		236,
		196,
		197,
		201,
		230,
		198,
		244,
		246,
		242,
		251,
		249,
		255,
		214,
		220,
		162,
		163,
		165,
		8359,
		402,
		225,
		237,
		243,
		250,
		241,
		209,
		170,
		186,
		191,
		8976,
		172,
		189,
		188,
		161,
		171,
		187,
		9617,
		9618,
		9619,
		9474,
		9508,
		9569,
		9570,
		9558,
		9557,
		9571,
		9553,
		9559,
		9565,
		9564,
		9563,
		9488,
		9492,
		9524,
		9516,
		9500,
		9472,
		9532,
		9566,
		9567,
		9562,
		9556,
		9577,
		9574,
		9568,
		9552,
		9580,
		9575,
		9576,
		9572,
		9573,
		9561,
		9560,
		9554,
		9555,
		9579,
		9578,
		9496,
		9484,
		9608,
		9604,
		9612,
		9616,
		9600,
		945,
		223,
		915,
		960,
		931,
		963,
		181,
		964,
		934,
		920,
		937,
		948,
		8734,
		966,
		949,
		8745,
		8801,
		177,
		8805,
		8804,
		8992,
		8993,
		247,
		8776,
		176,
		8729,
		183,
		8730,
		8319,
		178,
		9632,
		160
	],
	CP850: [
		199,
		252,
		233,
		226,
		228,
		224,
		229,
		231,
		234,
		235,
		232,
		239,
		238,
		236,
		196,
		197,
		201,
		230,
		198,
		244,
		246,
		242,
		251,
		249,
		255,
		214,
		220,
		248,
		163,
		216,
		215,
		402,
		225,
		237,
		243,
		250,
		241,
		209,
		170,
		186,
		191,
		174,
		172,
		189,
		188,
		161,
		171,
		187,
		9617,
		9618,
		9619,
		9474,
		9508,
		193,
		194,
		192,
		169,
		9571,
		9553,
		9559,
		9565,
		162,
		165,
		9488,
		9492,
		9524,
		9516,
		9500,
		9472,
		9532,
		227,
		195,
		9562,
		9556,
		9577,
		9574,
		9568,
		9552,
		9580,
		164,
		240,
		208,
		202,
		203,
		200,
		305,
		205,
		206,
		207,
		9496,
		9484,
		9608,
		9604,
		166,
		204,
		9600,
		211,
		223,
		212,
		210,
		245,
		213,
		181,
		254,
		222,
		218,
		219,
		217,
		253,
		221,
		175,
		180,
		173,
		177,
		8215,
		190,
		182,
		167,
		247,
		184,
		176,
		168,
		183,
		185,
		179,
		178,
		9632,
		160
	],
	CP852: [
		199,
		252,
		233,
		226,
		228,
		367,
		263,
		231,
		322,
		235,
		336,
		337,
		238,
		377,
		196,
		262,
		201,
		313,
		314,
		244,
		246,
		317,
		318,
		346,
		347,
		214,
		220,
		356,
		357,
		321,
		215,
		269,
		225,
		237,
		243,
		250,
		260,
		261,
		381,
		382,
		280,
		281,
		172,
		378,
		268,
		351,
		171,
		187,
		9617,
		9618,
		9619,
		9474,
		9508,
		193,
		194,
		282,
		350,
		9571,
		9553,
		9559,
		9565,
		379,
		380,
		9488,
		9492,
		9524,
		9516,
		9500,
		9472,
		9532,
		258,
		259,
		9562,
		9556,
		9577,
		9574,
		9568,
		9552,
		9580,
		164,
		273,
		272,
		270,
		203,
		271,
		327,
		205,
		206,
		283,
		9496,
		9484,
		9608,
		9604,
		354,
		366,
		9600,
		211,
		223,
		212,
		323,
		324,
		328,
		352,
		353,
		340,
		218,
		341,
		368,
		253,
		221,
		355,
		180,
		173,
		733,
		731,
		711,
		728,
		167,
		247,
		184,
		176,
		168,
		729,
		369,
		344,
		345,
		9632,
		160
	],
	CP855: [
		1106,
		1026,
		1107,
		1027,
		1105,
		1025,
		1108,
		1028,
		1109,
		1029,
		1110,
		1030,
		1111,
		1031,
		1112,
		1032,
		1113,
		1033,
		1114,
		1034,
		1115,
		1035,
		1116,
		1036,
		1118,
		1038,
		1119,
		1039,
		1102,
		1070,
		1098,
		1066,
		1072,
		1040,
		1073,
		1041,
		1094,
		1062,
		1076,
		1044,
		1077,
		1045,
		1092,
		1060,
		1075,
		1043,
		171,
		187,
		9617,
		9618,
		9619,
		9474,
		9508,
		1093,
		1061,
		1080,
		1048,
		9571,
		9553,
		9559,
		9565,
		1081,
		1049,
		9488,
		9492,
		9524,
		9516,
		9500,
		9472,
		9532,
		1082,
		1050,
		9562,
		9556,
		9577,
		9574,
		9568,
		9552,
		9580,
		164,
		1083,
		1051,
		1084,
		1052,
		1085,
		1053,
		1086,
		1054,
		1087,
		9496,
		9484,
		9608,
		9604,
		1055,
		1103,
		9600,
		1071,
		1088,
		1056,
		1089,
		1057,
		1090,
		1058,
		1091,
		1059,
		1078,
		1046,
		1074,
		1042,
		1100,
		1068,
		8470,
		173,
		1099,
		1067,
		1079,
		1047,
		1096,
		1064,
		1101,
		1069,
		1097,
		1065,
		1095,
		1063,
		167,
		9632,
		160
	],
	CP857: [
		199,
		252,
		233,
		226,
		228,
		224,
		229,
		231,
		234,
		235,
		232,
		239,
		238,
		305,
		196,
		197,
		201,
		230,
		198,
		244,
		246,
		242,
		251,
		249,
		304,
		214,
		220,
		248,
		163,
		216,
		350,
		351,
		225,
		237,
		243,
		250,
		241,
		209,
		286,
		287,
		191,
		174,
		172,
		189,
		188,
		161,
		171,
		187,
		9617,
		9618,
		9619,
		9474,
		9508,
		193,
		194,
		192,
		169,
		9571,
		9553,
		9559,
		9565,
		162,
		165,
		9488,
		9492,
		9524,
		9516,
		9500,
		9472,
		9532,
		227,
		195,
		9562,
		9556,
		9577,
		9574,
		9568,
		9552,
		9580,
		164,
		186,
		170,
		202,
		203,
		200,
		65533,
		205,
		206,
		207,
		9496,
		9484,
		9608,
		9604,
		166,
		204,
		9600,
		211,
		223,
		212,
		210,
		245,
		213,
		181,
		65533,
		215,
		218,
		219,
		217,
		236,
		255,
		175,
		180,
		173,
		177,
		65533,
		190,
		182,
		167,
		247,
		184,
		176,
		168,
		183,
		185,
		179,
		178,
		9632,
		160
	],
	CP860: [
		199,
		252,
		233,
		226,
		227,
		224,
		193,
		231,
		234,
		202,
		232,
		205,
		212,
		236,
		195,
		194,
		201,
		192,
		200,
		244,
		245,
		242,
		218,
		249,
		204,
		213,
		220,
		162,
		163,
		217,
		8359,
		211,
		225,
		237,
		243,
		250,
		241,
		209,
		170,
		186,
		191,
		210,
		172,
		189,
		188,
		161,
		171,
		187,
		9617,
		9618,
		9619,
		9474,
		9508,
		9569,
		9570,
		9558,
		9557,
		9571,
		9553,
		9559,
		9565,
		9564,
		9563,
		9488,
		9492,
		9524,
		9516,
		9500,
		9472,
		9532,
		9566,
		9567,
		9562,
		9556,
		9577,
		9574,
		9568,
		9552,
		9580,
		9575,
		9576,
		9572,
		9573,
		9561,
		9560,
		9554,
		9555,
		9579,
		9578,
		9496,
		9484,
		9608,
		9604,
		9612,
		9616,
		9600,
		945,
		223,
		915,
		960,
		931,
		963,
		181,
		964,
		934,
		920,
		937,
		948,
		8734,
		966,
		949,
		8745,
		8801,
		177,
		8805,
		8804,
		8992,
		8993,
		247,
		8776,
		176,
		8729,
		183,
		8730,
		8319,
		178,
		9632,
		160
	],
	CP861: [
		199,
		252,
		233,
		226,
		228,
		224,
		229,
		231,
		234,
		235,
		232,
		208,
		240,
		222,
		196,
		197,
		201,
		230,
		198,
		244,
		246,
		254,
		251,
		221,
		253,
		214,
		220,
		248,
		163,
		216,
		8359,
		402,
		225,
		237,
		243,
		250,
		193,
		205,
		211,
		218,
		191,
		8976,
		172,
		189,
		188,
		161,
		171,
		187,
		9617,
		9618,
		9619,
		9474,
		9508,
		9569,
		9570,
		9558,
		9557,
		9571,
		9553,
		9559,
		9565,
		9564,
		9563,
		9488,
		9492,
		9524,
		9516,
		9500,
		9472,
		9532,
		9566,
		9567,
		9562,
		9556,
		9577,
		9574,
		9568,
		9552,
		9580,
		9575,
		9576,
		9572,
		9573,
		9561,
		9560,
		9554,
		9555,
		9579,
		9578,
		9496,
		9484,
		9608,
		9604,
		9612,
		9616,
		9600,
		945,
		223,
		915,
		960,
		931,
		963,
		181,
		964,
		934,
		920,
		937,
		948,
		8734,
		966,
		949,
		8745,
		8801,
		177,
		8805,
		8804,
		8992,
		8993,
		247,
		8776,
		176,
		8729,
		183,
		8730,
		8319,
		178,
		9632,
		160
	],
	CP863: [
		199,
		252,
		233,
		226,
		194,
		224,
		182,
		231,
		234,
		235,
		232,
		239,
		238,
		8215,
		192,
		167,
		201,
		200,
		202,
		244,
		203,
		207,
		251,
		249,
		164,
		212,
		220,
		162,
		163,
		217,
		219,
		402,
		166,
		180,
		243,
		250,
		168,
		184,
		179,
		175,
		206,
		8976,
		172,
		189,
		188,
		190,
		171,
		187,
		9617,
		9618,
		9619,
		9474,
		9508,
		9569,
		9570,
		9558,
		9557,
		9571,
		9553,
		9559,
		9565,
		9564,
		9563,
		9488,
		9492,
		9524,
		9516,
		9500,
		9472,
		9532,
		9566,
		9567,
		9562,
		9556,
		9577,
		9574,
		9568,
		9552,
		9580,
		9575,
		9576,
		9572,
		9573,
		9561,
		9560,
		9554,
		9555,
		9579,
		9578,
		9496,
		9484,
		9608,
		9604,
		9612,
		9616,
		9600,
		945,
		223,
		915,
		960,
		931,
		963,
		181,
		964,
		934,
		920,
		937,
		948,
		8734,
		966,
		949,
		8745,
		8801,
		177,
		8805,
		8804,
		8992,
		8993,
		247,
		8776,
		176,
		8729,
		183,
		8730,
		8319,
		178,
		9632,
		160
	],
	CP864: [
		176,
		183,
		8729,
		8730,
		9618,
		9472,
		9474,
		9532,
		9508,
		9516,
		9500,
		9524,
		9488,
		9484,
		9492,
		9496,
		946,
		8734,
		966,
		177,
		189,
		188,
		8776,
		171,
		187,
		65271,
		65272,
		65533,
		65533,
		65275,
		65276,
		65533,
		160,
		173,
		65154,
		163,
		164,
		65156,
		65533,
		65533,
		65166,
		65167,
		65173,
		65177,
		1548,
		65181,
		65185,
		65189,
		1632,
		1633,
		1634,
		1635,
		1636,
		1637,
		1638,
		1639,
		1640,
		1641,
		65233,
		1563,
		65201,
		65205,
		65209,
		1567,
		162,
		65152,
		65153,
		65155,
		65157,
		65226,
		65163,
		65165,
		65169,
		65171,
		65175,
		65179,
		65183,
		65187,
		65191,
		65193,
		65195,
		65197,
		65199,
		65203,
		65207,
		65211,
		65215,
		65217,
		65221,
		65227,
		65231,
		166,
		172,
		247,
		215,
		65225,
		1600,
		65235,
		65239,
		65243,
		65247,
		65251,
		65255,
		65259,
		65261,
		65263,
		65267,
		65213,
		65228,
		65230,
		65229,
		65249,
		65149,
		1617,
		65253,
		65257,
		65260,
		65264,
		65266,
		65232,
		65237,
		65269,
		65270,
		65245,
		65241,
		65265,
		9632,
		65533
	],
	CP865: [
		199,
		252,
		233,
		226,
		228,
		224,
		229,
		231,
		234,
		235,
		232,
		239,
		238,
		236,
		196,
		197,
		201,
		230,
		198,
		244,
		246,
		242,
		251,
		249,
		255,
		214,
		220,
		248,
		163,
		216,
		8359,
		402,
		225,
		237,
		243,
		250,
		241,
		209,
		170,
		186,
		191,
		8976,
		172,
		189,
		188,
		161,
		171,
		164,
		9617,
		9618,
		9619,
		9474,
		9508,
		9569,
		9570,
		9558,
		9557,
		9571,
		9553,
		9559,
		9565,
		9564,
		9563,
		9488,
		9492,
		9524,
		9516,
		9500,
		9472,
		9532,
		9566,
		9567,
		9562,
		9556,
		9577,
		9574,
		9568,
		9552,
		9580,
		9575,
		9576,
		9572,
		9573,
		9561,
		9560,
		9554,
		9555,
		9579,
		9578,
		9496,
		9484,
		9608,
		9604,
		9612,
		9616,
		9600,
		945,
		223,
		915,
		960,
		931,
		963,
		181,
		964,
		934,
		920,
		937,
		948,
		8734,
		966,
		949,
		8745,
		8801,
		177,
		8805,
		8804,
		8992,
		8993,
		247,
		8776,
		176,
		8729,
		183,
		8730,
		8319,
		178,
		9632,
		160
	],
	CP866: [
		1040,
		1041,
		1042,
		1043,
		1044,
		1045,
		1046,
		1047,
		1048,
		1049,
		1050,
		1051,
		1052,
		1053,
		1054,
		1055,
		1056,
		1057,
		1058,
		1059,
		1060,
		1061,
		1062,
		1063,
		1064,
		1065,
		1066,
		1067,
		1068,
		1069,
		1070,
		1071,
		1072,
		1073,
		1074,
		1075,
		1076,
		1077,
		1078,
		1079,
		1080,
		1081,
		1082,
		1083,
		1084,
		1085,
		1086,
		1087,
		9617,
		9618,
		9619,
		9474,
		9508,
		9569,
		9570,
		9558,
		9557,
		9571,
		9553,
		9559,
		9565,
		9564,
		9563,
		9488,
		9492,
		9524,
		9516,
		9500,
		9472,
		9532,
		9566,
		9567,
		9562,
		9556,
		9577,
		9574,
		9568,
		9552,
		9580,
		9575,
		9576,
		9572,
		9573,
		9561,
		9560,
		9554,
		9555,
		9579,
		9578,
		9496,
		9484,
		9608,
		9604,
		9612,
		9616,
		9600,
		1088,
		1089,
		1090,
		1091,
		1092,
		1093,
		1094,
		1095,
		1096,
		1097,
		1098,
		1099,
		1100,
		1101,
		1102,
		1103,
		1025,
		1105,
		1028,
		1108,
		1031,
		1111,
		1038,
		1118,
		176,
		8729,
		183,
		8730,
		8470,
		164,
		9632,
		160
	],
	CP869: [
		65533,
		65533,
		65533,
		65533,
		65533,
		65533,
		902,
		65533,
		183,
		172,
		166,
		8216,
		8217,
		904,
		8213,
		905,
		906,
		938,
		908,
		65533,
		65533,
		910,
		939,
		169,
		911,
		178,
		179,
		940,
		163,
		941,
		942,
		943,
		970,
		912,
		972,
		973,
		913,
		914,
		915,
		916,
		917,
		918,
		919,
		189,
		920,
		921,
		171,
		187,
		9617,
		9618,
		9619,
		9474,
		9508,
		922,
		923,
		924,
		925,
		9571,
		9553,
		9559,
		9565,
		926,
		927,
		9488,
		9492,
		9524,
		9516,
		9500,
		9472,
		9532,
		928,
		929,
		9562,
		9556,
		9577,
		9574,
		9568,
		9552,
		9580,
		931,
		932,
		933,
		934,
		935,
		936,
		937,
		945,
		946,
		947,
		9496,
		9484,
		9608,
		9604,
		948,
		949,
		9600,
		950,
		951,
		952,
		953,
		954,
		955,
		956,
		957,
		958,
		959,
		960,
		961,
		963,
		962,
		964,
		900,
		173,
		177,
		965,
		966,
		967,
		167,
		968,
		901,
		176,
		168,
		969,
		971,
		944,
		974,
		9632,
		160
	],
	MAC_ROMAN: [
		196,
		197,
		199,
		201,
		209,
		214,
		220,
		225,
		224,
		226,
		228,
		227,
		229,
		231,
		233,
		232,
		234,
		235,
		237,
		236,
		238,
		239,
		241,
		243,
		242,
		244,
		246,
		245,
		250,
		249,
		251,
		252,
		8224,
		176,
		162,
		163,
		167,
		8226,
		182,
		223,
		174,
		169,
		8482,
		180,
		168,
		8800,
		198,
		216,
		8734,
		177,
		8804,
		8805,
		165,
		181,
		8706,
		8721,
		8719,
		960,
		8747,
		170,
		186,
		8486,
		230,
		248,
		191,
		161,
		172,
		8730,
		402,
		8776,
		8710,
		171,
		187,
		8230,
		160,
		192,
		195,
		213,
		338,
		339,
		8211,
		8212,
		8220,
		8221,
		8216,
		8217,
		247,
		9674,
		255,
		376,
		8260,
		164,
		8249,
		8250,
		64257,
		64258,
		8225,
		183,
		8218,
		8222,
		8240,
		194,
		202,
		193,
		203,
		200,
		205,
		206,
		207,
		204,
		211,
		212,
		65533,
		210,
		218,
		219,
		217,
		305,
		710,
		732,
		175,
		728,
		729,
		730,
		184,
		733,
		731,
		711
	]
}, Oe = (e, t) => {
	switch (e.code) {
		case 6: return t + 1;
		case 8: return t - 1;
		case 10: return t + e.value;
		case 12: return t - e.value;
		default: return e.value;
	}
}, ke = /* @__PURE__ */ new WeakMap(), Ae = null, je = null, Me = (e) => {
	let t = e.buffer;
	if (t === Ae && je) return je;
	let n = ke.get(t);
	return n || ke.set(t, n = new DataView(t)), Ae = t, je = n, n;
}, z = class {
	data;
	pos = 0;
	endBit;
	scratch;
	sBytes;
	sF64;
	view;
	base;
	constructor(e, t = 0, n) {
		this.data = e, this.pos = t, this.endBit = n ?? e.length * 8, this.view = Me(e), this.base = e.byteOffset;
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
}, Ne = [
	8364,
	1662,
	8218,
	402,
	8222,
	8230,
	8224,
	8225,
	710,
	8240,
	1657,
	8249,
	338,
	1670,
	1688,
	1672,
	1711,
	8216,
	8217,
	8220,
	8221,
	8226,
	8211,
	8212,
	1705,
	8482,
	1681,
	8250,
	339,
	8204,
	8205,
	1722,
	160,
	1548,
	162,
	163,
	164,
	165,
	166,
	167,
	168,
	169,
	1726,
	171,
	172,
	173,
	174,
	175,
	176,
	177,
	178,
	179,
	180,
	181,
	182,
	183,
	184,
	185,
	1563,
	187,
	188,
	189,
	190,
	1567,
	1729,
	1569,
	1570,
	1571,
	1572,
	1573,
	1574,
	1575,
	1576,
	1577,
	1578,
	1579,
	1580,
	1581,
	1582,
	1583,
	1584,
	1585,
	1586,
	1587,
	1588,
	1589,
	1590,
	215,
	1591,
	1592,
	1593,
	1594,
	1600,
	1601,
	1602,
	1603,
	224,
	1604,
	226,
	1605,
	1606,
	1607,
	1608,
	231,
	232,
	233,
	234,
	235,
	1609,
	1610,
	238,
	239,
	1611,
	1612,
	1613,
	1614,
	244,
	1615,
	1616,
	247,
	1617,
	249,
	1618,
	251,
	252,
	8206,
	8207,
	1746
], Pe = /* @__PURE__ */ new Map(), Fe = (e) => {
	let t = e ?? "", n = Pe.get(t);
	if (n !== void 0) return n;
	let r = Ie(e);
	return Pe.size < 1e3 && Pe.set(t, r), r;
}, Ie = (e) => {
	let t = String(e ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
	if (!t) return "ANSI_1252";
	let n = t.match(/^(?:ANSI|WINDOWS)(\d{3,4})$/);
	return n ? "ANSI_" + n[1] : (n = t.match(/^(?:DOS|CP|IBM)(\d{3})$/), n ? "CP" + n[1] : (n = t.match(/^ISO8859(\d)$/), n ? "ISO8859_" + n[1] : t.includes("1256") ? "ANSI_1256" : t.includes("1252") ? "ANSI_1252" : t));
}, Le = /* @__PURE__ */ new Map(), Re = (e) => {
	let t = /* @__PURE__ */ new Map(), n = 0, r = 0;
	if (!e) return t;
	for (let i of e.split(";")) {
		let e = i.indexOf(",");
		n += parseInt(i.slice(0, e), 36), r += parseInt(i.slice(e + 1), 36), t.set(n, r);
	}
	return t;
}, ze = (e, t) => {
	let n = e + (t ? ":1" : ":2"), r = Le.get(n);
	if (r) return r;
	let i = t ? ye[e] : ve[e];
	if (i === void 0) return null;
	let a = Re(i);
	return Le.set(n, a), a;
}, Be = {
	CP932: "CP932",
	ANSI_932: "CP932",
	BIG5: "BIG5",
	ANSI_950: "BIG5",
	GB2312: "GB2312",
	ANSI_936: "GB2312",
	CP949: "CP949",
	ANSI_949: "CP949",
	ANSI_1361: "CP949",
	JOHAB: "JOHAB"
}, Ve = (e, t) => {
	let n = Fe(t), r = Be[n];
	if (r) {
		let t = ze(r, !1), n = ze(r, !0), i = "";
		for (let r = 0; r < e.length; r++) {
			let a = e[r];
			if (a === 0) break;
			if (a < 128) {
				i += String.fromCharCode(a);
				continue;
			}
			if (r + 1 < e.length) {
				let n = a << 8 | e[r + 1], o = t?.get(n) ?? t?.get(n & 32639);
				if (o !== void 0) {
					i += String.fromCharCode(o), r++;
					continue;
				}
			}
			let o = n?.get(a);
			i += String.fromCharCode(o ?? 65533);
		}
		return i;
	}
	let i = n === "ANSI_1256" ? Ne : n === "ANSI_1252" ? void 0 : n === "ISO8859_1" || n === "US_ASCII" || n === "UTF8" ? He : De[n], a = "";
	for (let t of e) {
		if (t === 0) break;
		if (t < 128) {
			a += String.fromCharCode(t);
			continue;
		}
		a += i ? String.fromCharCode(i[t - 128]) : t < 160 ? String.fromCharCode(Ce[t - 128]) : String.fromCharCode(t);
	}
	return a;
}, He = Array.from({ length: 128 }, (e, t) => 128 + t), Ue = 141, We = (e, t, n) => {
	let r = /* @__PURE__ */ new Map(), a = i(t);
	try {
		let t = 0;
		e[0] === Ue && (t = 16);
		let i = new DataView(e.buffer, e.byteOffset, e.byteLength), o = i.getUint32(t, !0);
		t += 4;
		let s, c = null;
		if (a >= 2007) {
			let n = (e) => e > 0 && e <= o * 8 && e >= o * 8 - 512;
			a >= 2010 && !n(i.getUint32(t, !0)) && n(i.getUint32(t + 4, !0)) && (t += 4);
			let r = t * 8, l = i.getUint32(t, !0);
			t += 4;
			let u = r + l - 1, d = new z(e, u);
			if (d.b()) {
				let t = u - 16;
				d.pos = t;
				let n = d.rs();
				if (n & 32768) {
					t -= 16, d.pos = t;
					let e = d.rs();
					n = n & 32767 | e << 15;
				}
				c = new z(e, t - n, u);
			}
			s = u;
		} else s = (t + o) * 8 - 8;
		let l = new z(e, t * 8), u = Infinity;
		if (a >= 2004) {
			let e = l.bs();
			if (l.rc(), l.rc(), l.b(), e < 500 || e > 5e3) return r;
			u = e - 499;
		}
		let d = () => c ? c.tu() : Ve(l.tBytes(), n);
		for (; u-- > 0 && l.pos + 20 < s;) {
			let e = l.bs();
			l.bs();
			let t = d(), n = d(), i = d();
			l.b();
			let o = l.bs(), s, c;
			if (a >= 2004 && (l.bl(), s = l.bl(), c = l.bl(), l.bl(), l.bl()), e < 500 || e > 5e3 || !i) break;
			r.set(e, {
				classNum: e,
				dxfName: i,
				cppName: n,
				appName: t,
				isEntity: o === 498,
				...s === void 0 ? {} : {
					dwgVersion: s,
					maintVersion: c
				}
			});
		}
	} catch {}
	return r;
}, Ge = 207, Ke = (e, t, n, r) => {
	let a = qe(e, t, n, r, !1), o = (e) => !!e?.extMin && Math.abs(e.extMin.x) < 0x8ac7230489e80000 && isFinite(e.extMin.x);
	if (o(a) || i(t) !== 13) return a;
	let s = qe(e, t, n, r, !0);
	return o(s) ? s : a;
}, qe = (e, t, n, r, a) => {
	let o = i(t), s = { vars: {} };
	try {
		let t = 0;
		e[0] === Ge && (t = 16);
		let i = new DataView(e.buffer, e.byteOffset, e.byteLength);
		i.getUint32(t, !0), t += 4;
		let c, l, u = null;
		if (o >= 2007) {
			let r = 160;
			o >= 2010 && (o >= 2018 || n > 3) && (t += 4, r += 32);
			let a = t * 8, s = i.getUint32(t, !0);
			t += 4, c = new z(e, t * 8), l = new z(e, r + s);
			let d = a + s - 1, f = new z(e, d);
			if (f.b()) {
				let t = d - 16;
				f.pos = t;
				let n = f.rs();
				if (n & 32768) {
					t -= 16, f.pos = t;
					let e = f.rs();
					n = n & 32767 | e << 15;
				}
				u = new z(e, t - n, d);
			}
		} else c = new z(e, t * 8), l = c;
		let d = () => u ? u.tu() : Ve(c.tBytes(), r), f = () => l.h().value, p = () => {
			let e = c.bs();
			if (o < 2004) return e;
			let t = c.bl() >>> 0, n = c.rc();
			n & 1 && d(), n & 2 && d();
			let r = t >>> 24 & 255;
			return r === 192 ? 256 : r === 193 ? 0 : r === 195 ? t & 255 : e;
		}, m = (e) => {
			s.vars[e] = c.bl(), s.vars[e + "_MS"] = c.bl();
		}, h = () => {
			let [e, t, n] = c.bd3();
			return {
				x: e,
				y: t,
				z: n
			};
		}, g = () => ({
			x: c.rd(),
			y: c.rd()
		});
		o >= 2013 && c.bll(), c.bd(), c.bd(), c.bd(), c.bd(), d(), d(), d(), d(), c.bl(), c.bl(), o <= 14 && c.bs(), o <= 2e3 && f(), c.b(), c.b(), o <= 14 && c.b(), c.b(), c.b(), c.b(), c.b(), c.b(), c.b(), c.b(), o <= 14 && c.b(), o >= 2004 && c.b(), c.b(), c.b(), c.b(), c.b(), o <= 14 && (c.b(), c.b()), c.b(), c.b(), o <= 14 && c.b();
		let _ = c.b();
		s.vars.TILEMODE = _ === 1, c.b(), c.b(), o <= 14 && c.b(), c.b(), c.b(), o === 13 && a && c.bs(), c.bs(), o <= 14 && c.bs(), c.bs(), s.vars.LUNITS = c.bs(), s.vars.LUPREC = c.bs(), s.vars.AUNITS = c.bs(), s.vars.AUPREC = c.bs(), o <= 14 && c.bs(), c.bs(), o <= 14 && c.bs(), s.pdMode = c.bs(), o <= 14 && c.bs(), o >= 2004 && (c.bl(), c.bl(), c.bl());
		for (let e = 0; e < 5; e++) c.bs();
		for (let e = 0; e < 14; e++) {
			let t = c.bs();
			e === 11 && (s.vars.ISOLINES = t);
		}
		s.ltScale = c.bd(), s.textSize = c.bd(), c.bd(), c.bd(), c.bd(), c.bd(), s.vars.ANGBASE = c.bd(), s.pdSize = c.bd(), c.bd();
		for (let e = 0; e < 5; e++) c.bd();
		for (let e = 0; e < 4; e++) c.bd();
		if (c.bd(), c.bd(), c.bd(), d(), m("TDCREATE"), m("TDUPDATE"), o >= 2004 && (c.bl(), c.bl(), c.bl()), m("TDINDWG"), m("TDUSRTIMER"), s.celColorIndex = p(), s.handseed = c.h().value, s.clayerHandle = f(), s.textStyleHandle = f(), s.celtypeHandle = f(), o >= 2007 && f(), s.dimStyleHandle = f(), s.cmlStyleHandle = f() || void 0, o >= 2e3 && c.bd(), h(), h(), h(), g(), g(), c.bd(), s.pUcs = {
			origin: h(),
			xAxis: h(),
			yAxis: h()
		}, s.pUcsNameHandle = f() || void 0, o >= 2e3) {
			f(), c.bs(), f();
			for (let e = 0; e < 6; e++) h();
		}
		if (h(), s.extMin = h(), s.extMax = h(), s.limMin = g(), s.limMax = g(), c.bd(), s.ucs = {
			origin: h(),
			xAxis: h(),
			yAxis: h()
		}, s.ucsNameHandle = f() || void 0, o >= 2e3) {
			f(), c.bs(), f();
			for (let e = 0; e < 6; e++) h();
			d(), d();
		}
		if (o <= 14) {
			for (let e = 0; e < 11; e++) c.b();
			c.rc(), c.rc(), c.b(), c.b(), c.rc(), c.rc(), c.rc(), c.b(), c.rc(), c.rc(), c.rc(), c.rc(), c.bs(), c.bs(), c.bs(), c.bs(), c.bs(), c.bs(), f();
		}
		for (let e of [
			"DIMSCALE",
			"DIMASZ",
			"DIMEXO",
			"DIMDLI",
			"DIMEXE",
			"DIMRND",
			"DIMDLE",
			"DIMTP",
			"DIMTM"
		]) s.vars[e] = c.bd();
		if (o >= 2007 && (c.bd(), c.bd(), c.bs(), p()), o >= 2e3) {
			for (let e = 0; e < 6; e++) c.b();
			c.bs(), c.bs(), c.bs();
		}
		o >= 2007 && c.bs();
		for (let e of [
			"DIMTXT",
			"DIMCEN",
			"DIMTSZ",
			"DIMALTF",
			"DIMLFAC",
			"DIMTVP",
			"DIMTFAC",
			"DIMGAP"
		]) s.vars[e] = c.bd();
		if (o <= 14 && (d(), d(), d(), d(), d()), o >= 2e3 && (c.bd(), c.b(), c.bs(), c.b(), c.b(), c.b(), c.b()), p(), p(), p(), o >= 2e3) {
			c.bs(), s.vars.DIMDEC = c.bs();
			for (let e = 0; e < 9; e++) c.bs();
			c.b(), c.b(), c.bs(), c.bs(), c.bs(), c.bs(), c.b(), c.bs();
		}
		if (o >= 2007 && c.b(), o >= 2010 && (c.b(), c.bd(), d(), c.bd(), d()), o >= 2e3) {
			for (let e = 0; e < 5; e++) f();
			o >= 2007 && (f(), f(), f()), c.bs(), c.bs();
		}
		for (let e = 0; e < 9; e++) f();
		o <= 2e3 && f(), f(), f(), s.nodHandle = f() || void 0, o >= 2e3 && (c.bs(), c.bs(), d(), d(), f(), f(), f(), o >= 2004 && (f(), f()), o >= 2007 && f(), o >= 2013 && f(), c.bl(), s.insUnits = c.bs(), c.bs() === 3 && f(), s.vars.FINGERPRINTGUID = d(), s.vars.VERSIONGUID = d()), o >= 2004 && (s.vars.SORTENTS = c.rc(), s.vars.INDEXCTL = c.rc(), s.vars.HIDETEXT = c.rc(), s.vars.XCLIPFRAME = c.rc(), s.vars.DIMASSOC = c.rc(), s.vars.HALOGAP = c.rc(), c.bs(), c.bs(), c.rc(), c.rc(), d()), f(), f(), f(), f(), f(), o >= 2007 && (s.vars.CAMERADISPLAY = c.b() === 1, c.bl(), c.bl(), c.bd(), s.vars.STEPSPERSEC = c.bd(), s.vars.STEPSIZE = c.bd(), s.vars["3DDWFPREC"] = c.bd(), s.vars.LENSLENGTH = c.bd(), s.vars.CAMERAHEIGHT = c.bd(), s.vars.SOLIDHIST = c.rc(), s.vars.SHOWHIST = c.rc(), s.vars.PSOLWIDTH = c.bd(), s.vars.PSOLHEIGHT = c.bd(), s.vars.LOFTANG1 = c.bd(), s.vars.LOFTANG2 = c.bd(), s.vars.LOFTMAG1 = c.bd(), s.vars.LOFTMAG2 = c.bd(), s.vars.LOFTPARAM = c.bs(), s.vars.LOFTNORMALS = c.rc(), s.vars.LATITUDE = c.bd(), s.vars.LONGITUDE = c.bd(), s.vars.NORTHDIRECTION = c.bd(), s.vars.TIMEZONE = c.bl(), s.vars.LIGHTGLYPHDISPLAY = c.rc(), s.vars.TILEMODELIGHTSYNCH = c.rc(), s.vars.DWFFRAME = c.rc(), s.vars.DGNFRAME = c.rc(), c.b(), s.vars.INTERFERECOLOR = p(), f(), f(), f(), s.vars.CSHADOW = c.rc(), c.bd()), o >= 13 && o <= 2004 && (c.bs(), c.bs(), c.bs(), c.bs());
	} catch {}
	return s.extMin || s.insUnits !== void 0 || s.ltScale !== void 0 ? s : null;
}, Je = [
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
], Ye = (e, t) => {
	try {
		if (t <= 0 || t + 21 > e.length) return null;
		for (let n = 0; n < 16; n++) if (e[t + n] !== Je[n]) return null;
		let n = new DataView(e.buffer, e.byteOffset, e.byteLength), r = t + 16, i = n.getUint32(r, !0);
		if (r += 4, i < 5 || t + 20 + i > e.length) return null;
		let a = e[r++];
		if (a === 0 || a > 16) return null;
		let o = 0, s = 0, c = null;
		for (let t = 0; t < a && r + 9 <= e.length; t++) {
			let t = e[r++];
			r += 4;
			let i = n.getUint32(r, !0);
			r += 4, t === 1 ? o += i : t === 2 && !c ? (c = "bmp", s = i) : t === 3 && !c ? (c = "wmf", s = i) : t === 6 && !c && (c = "png", s = i);
		}
		if (!c || s <= 0) return null;
		let l = r + o;
		if (l < 0 || l + s > e.length) return null;
		let u = e.subarray(l, l + s);
		if (c !== "bmp") return {
			format: c,
			data: u.slice()
		};
		let d = new Uint8Array(14 + u.length), f = new DataView(d.buffer);
		d[0] = 66, d[1] = 77, f.setUint32(2, d.length, !0);
		let p = u.length >= 4 ? new DataView(u.buffer, u.byteOffset, u.byteLength).getUint32(0, !0) : 40, m = u.length >= 16 ? new DataView(u.buffer, u.byteOffset, u.byteLength).getUint16(14, !0) : 24, h = m <= 8 ? 1 << m : 0;
		return f.setUint32(10, 14 + p + h * 4, !0), d.set(u, 14), {
			format: "bmp",
			data: d
		};
	} catch {
		return null;
	}
}, Xe = (e) => {
	let t = [], n = "";
	for (let t = 0; t < e.length; t++) n += String.fromCharCode(e[t]);
	let r = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", i = /(?:ACIS|ASM) BinaryFile/g, a;
	for (; (a = i.exec(n)) !== null;) {
		let o = a.index, s = -1, c = 0;
		for (let e of [
			"EndofASM\rdata",
			"EndofACIS\rdata",
			"\rEnd-of-ACIS-data"
		]) {
			let t = n.indexOf(e, o);
			t !== -1 && (s === -1 || t < s) && (s = t, c = e.length);
		}
		if (s === -1) break;
		let l = s + c - o, u = "";
		for (let t = 0; t < l; t += 3) {
			let n = e[o + t], i = e[o + t + 1], a = e[o + t + 2];
			u += r[n >> 2] + r[(n & 3) << 4 | (i ?? 0) >> 4] + (t + 1 < l ? r[((i ?? 0) & 15) << 2 | (a ?? 0) >> 6] : "=") + (t + 2 < l ? r[(a ?? 0) & 63] : "=");
		}
		t.push(u), i.lastIndex = o + l;
	}
	return t;
}, Ze = (e, t) => {
	try {
		let n = new z(e), r = () => {
			let e = n.rs();
			if (e < 0 || e > 65536) throw RangeError("summary string");
			let r = "";
			for (let i = 0; i < e; i++) r += String.fromCharCode(t ? n.rs() : n.rc());
			return r.replace(/\0+$/, "");
		}, i = {}, a = (e, t) => {
			t && (i[e] = t);
		};
		a("title", r()), a("subject", r()), a("author", r()), a("keywords", r()), a("comments", r()), a("lastSavedBy", r()), a("revisionNumber", r()), a("hyperlinkBase", r()), n.rl(), n.rl(), n.rl(), n.rl(), n.rl(), n.rl();
		let o = n.rs();
		if (o > 0 && o < 1e3) {
			let e = [];
			for (let t = 0; t < o; t++) {
				let t = r(), n = r();
				t && e.push({
					tag: t,
					value: n
				});
			}
			e.length && (i.custom = e);
		}
		return Object.keys(i).length ? i : null;
	} catch {
		return null;
	}
}, Qe = class {
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
}, B = (e, t, n = 0, r = t.length) => {
	let i = e & 65535;
	for (let e = n; e < r; e++) {
		i ^= t[e];
		for (let e = 0; e < 8; e++) i = i & 1 ? i >>> 1 ^ 40961 : i >>> 1;
	}
	return i & 65535;
}, V = (e) => {
	if (e.pos + 4 > e.end) throw RangeError("proxy: past end");
	let t = e.dv.getInt32(e.pos, !0);
	return e.pos += 4, t;
}, $e = (e) => {
	if (e.pos + 8 > e.end) throw RangeError("proxy: past end");
	let t = e.dv.getFloat64(e.pos, !0);
	return e.pos += 8, t;
}, H = (e) => ({
	x: $e(e),
	y: $e(e),
	z: $e(e)
}), et = (e, t, n) => {
	let r = [];
	if (e.length < 8) return r;
	let i = {
		dv: new DataView(e.buffer, e.byteOffset, e.byteLength),
		pos: 0,
		end: e.length
	}, a = {
		layer: t,
		color: n
	};
	try {
		V(i);
		let t = V(i);
		if (t < 0 || t > 1e5) return r;
		for (let n = 0; n < t && !(i.pos + 8 > i.end); n++) {
			let t = V(i), n = V(i), o = t > 8 ? i.pos + t - 8 : i.end;
			switch (n) {
				case 2: {
					let e = H(i), t = $e(i);
					t > 0 && r.push({
						...a,
						type: "circle",
						center: e,
						radius: t
					});
					break;
				}
				case 3: {
					let e = tt(H(i), H(i), H(i));
					e && r.push({
						...a,
						type: "circle",
						...e
					});
					break;
				}
				case 4: {
					let e = H(i), t = $e(i);
					H(i);
					let n = H(i), o = $e(i), s = Math.atan2(n.y, n.x);
					t > 0 && r.push({
						...a,
						type: "arc",
						center: e,
						radius: t,
						startAngle: s,
						endAngle: s + o
					});
					break;
				}
				case 5: {
					let e = H(i), t = H(i), n = H(i), o = tt(e, t, n);
					if (o) {
						let t = (e) => Math.atan2(e.y - o.center.y, e.x - o.center.x);
						r.push({
							...a,
							type: "arc",
							center: o.center,
							radius: o.radius,
							startAngle: t(e),
							endAngle: t(n)
						});
					}
					break;
				}
				case 6:
				case 7:
				case 32:
				case 33: {
					let e = V(i);
					if (e < 0 || e > 2e5) break;
					let t = [];
					for (let n = 0; n < e; n++) t.push(H(i));
					t.length >= 2 && r.push({
						...a,
						type: "polyline",
						vertices: t.map((e) => ({
							x: e.x,
							y: e.y
						})),
						closed: n === 7
					});
					break;
				}
				case 8: {
					let e = V(i), t = V(i), n = e * t;
					if (n < 0 || n > 2e5) break;
					let o = [];
					for (let e = 0; e < n; e++) o.push(H(i));
					o.length && r.push({
						...a,
						type: "mesh",
						meshKind: "grid",
						vertices: o,
						mSize: e,
						nSize: t
					});
					break;
				}
				case 9: {
					let e = V(i);
					if (e < 0 || e > 2e5) break;
					let t = [];
					for (let n = 0; n < e; n++) t.push(H(i));
					let n = V(i), s = [];
					if (n > 0 && n < 2e5) {
						let e = 0;
						for (; e < n && i.pos + 4 <= o;) {
							let t = V(i);
							e++;
							let r = [];
							for (let a = 0; a < Math.abs(t) && e < n; a++) r.push(V(i) + 1), e++;
							r.length >= 3 && s.push(r);
						}
					}
					t.length && r.push({
						...a,
						type: "mesh",
						meshKind: "faces",
						vertices: t,
						faces: s.length ? s : void 0
					});
					break;
				}
				case 10:
				case 11:
				case 36: {
					let t = H(i);
					H(i);
					let s = H(i), c = $e(i);
					$e(i), $e(i);
					let l = V(i), u = "";
					if (l > 0 && l < 1e5) for (let t = 0; t < l && i.pos < o; t++) {
						let t = n === 36 ? i.dv.getUint16((i.pos += 2) - 2, !0) : e[i.pos++];
						t && (u += String.fromCharCode(t));
					}
					u && r.push({
						...a,
						type: "text",
						position: t,
						text: u,
						height: c > 0 ? c : 1,
						rotation: Math.atan2(s.y, s.x)
					});
					break;
				}
				case 12:
				case 13: {
					let e = H(i), t = H(i);
					r.push({
						...a,
						type: n === 13 ? "ray" : "xline",
						basePoint: e,
						direction: {
							x: t.x - e.x,
							y: t.y - e.y,
							z: (t.z ?? 0) - (e.z ?? 0)
						}
					});
					break;
				}
			}
			if (o <= i.end && o > i.pos) i.pos = o;
			else if (o <= i.pos) continue;
			else break;
		}
	} catch {}
	return r;
}, tt = (e, t, n) => {
	let r = 2 * (e.x * (t.y - n.y) + t.x * (n.y - e.y) + n.x * (e.y - t.y));
	if (Math.abs(r) < 1e-12) return null;
	let i = e.x * e.x + e.y * e.y, a = t.x * t.x + t.y * t.y, o = n.x * n.x + n.y * n.y, s = (i * (t.y - n.y) + a * (n.y - e.y) + o * (e.y - t.y)) / r, c = (i * (n.x - t.x) + a * (e.x - n.x) + o * (t.x - e.x)) / r;
	return {
		center: {
			x: s,
			y: c,
			z: e.z ?? 0
		},
		radius: Math.hypot(e.x - s, e.y - c)
	};
}, nt = [
	"R1.1",
	"R1.2",
	"R1.3",
	"R1.4",
	"R2.0",
	"R2.10",
	"R2.21",
	"R2.22",
	"R2.4",
	"R2.5",
	"R2.6",
	"R9",
	"R10",
	"R12"
], rt = (e) => {
	let t = a(e);
	return nt.includes(t) ? t : "R12";
}, it = class {
	data;
	pos = 0;
	dv;
	constructor(e) {
		this.data = e, this.dv = new DataView(e.buffer, e.byteOffset, e.byteLength);
	}
	get end() {
		return this.data.length;
	}
	need(e) {
		if (this.pos + e > this.data.length) throw RangeError("pre-R13: past end");
	}
	rc() {
		return this.need(1), this.data[this.pos++];
	}
	rs() {
		this.need(2);
		let e = this.dv.getInt16(this.pos, !0);
		return this.pos += 2, e;
	}
	rsu() {
		this.need(2);
		let e = this.dv.getUint16(this.pos, !0);
		return this.pos += 2, e;
	}
	rl() {
		this.need(4);
		let e = this.dv.getUint32(this.pos, !0);
		return this.pos += 4, e;
	}
	rd() {
		this.need(8);
		let e = this.dv.getFloat64(this.pos, !0);
		return this.pos += 8, e;
	}
	pt2() {
		return [this.rd(), this.rd()];
	}
	pt3() {
		return {
			x: this.rd(),
			y: this.rd(),
			z: this.rd()
		};
	}
	tv(e) {
		return this.name(this.rsu(), e);
	}
	name(e, t) {
		this.need(e);
		let n = this.data.subarray(this.pos, this.pos + e);
		this.pos += e;
		let r = n.length;
		for (; r > 0 && n[r - 1] === 0;) r--;
		return we(Ve(n.subarray(0, r), t));
	}
}, at = (e) => {
	let t = e.rsu(), n = e.rs();
	return e.rsu(), {
		size: t,
		count: n,
		address: e.rl()
	};
}, ot = 1, st = 2, ct = 3, lt = 4, ut = 6, dt = 7, ft = 8, pt = 9, mt = 10, ht = 11, gt = 12, _t = 13, vt = 14, yt = 15, bt = 16, xt = 17, St = 18, Ct = 19, wt = 20, Tt = 21, Et = 22, Dt = 23, Ot = 24, kt = {
	[ot]: "LINE",
	[st]: "POINT",
	[ct]: "CIRCLE",
	[lt]: "SHAPE",
	5: "REPEAT",
	6: "ENDREP",
	[dt]: "TEXT",
	[ft]: "ARC",
	[pt]: "TRACE",
	10: "LOAD",
	[ht]: "SOLID",
	[gt]: "BLOCK",
	[_t]: "ENDBLK",
	[vt]: "INSERT",
	[yt]: "ATTDEF",
	[bt]: "ATTRIB",
	[xt]: "SEQEND",
	18: "JUMP",
	[Ct]: "POLYLINE",
	[wt]: "VERTEX",
	[Tt]: "3DLINE",
	[Et]: "3DFACE",
	[Dt]: "DIMENSION",
	[Ot]: "VIEWPORT"
}, At = 1, jt = 2, Mt = 4, Nt = 8, Pt = 32, Ft = 64, It = 128, Lt = 2, Rt = 4, zt = 1, Bt = 8, Vt = 16, Ht = 64, Ut = 64, U = 128, W = (e, t) => {
	let n = new it(e), r = [], i;
	try {
		for (; n.pos < e.length;) {
			let e = n.rc();
			switch (e) {
				case 0:
				case 1: {
					let a = n.name(n.rc(), t);
					e === 1 && i === void 0 ? i = a : r.push({
						code: 1e3 + e,
						value: a
					});
					break;
				}
				case 2:
					r.push({
						code: 1002,
						value: n.rc() === 0 ? "{" : "}"
					});
					break;
				case 3:
				case 5:
					r.push({
						code: 1e3 + e,
						value: n.rl() + ":" + n.rl()
					});
					break;
				case 4: {
					let e = n.rc(), t = "";
					for (let r = 0; r < e; r++) t += n.rc().toString(16).padStart(2, "0");
					r.push({
						code: 1004,
						value: t.toUpperCase()
					});
					break;
				}
				case 10:
				case 11:
				case 12:
				case 13:
					r.push({
						code: 1e3 + e,
						point: n.pt3()
					});
					break;
				case 40:
				case 41:
				case 42:
					r.push({
						code: 1e3 + e,
						value: n.rd()
					});
					break;
				case 70:
					r.push({
						code: 1070,
						value: n.rs()
					});
					break;
				case 71:
					r.push({
						code: 1071,
						value: n.rl() | 0
					});
					break;
				default: return r.length || i ? [{
					appName: i,
					values: r
				}] : [];
			}
		}
	} catch {}
	return r.length || i ? [{
		appName: i,
		values: r
	}] : [];
}, Wt = (t) => {
	let n = rt(t), r = nt.indexOf(n), i = r >= 4, a = r >= 12, o = r >= 13, s = e();
	s.header.version = n;
	let c = s.warnings, l = new it(t);
	l.pos = 11, l.rc();
	let u = 0, d = 0, f = 0, p = 0, m = 0, h = 0, g = 0, _ = 0;
	if (i) l.rc(), l.rsu(), g = l.rsu(), _ = l.rsu(), l.rc(), u = l.rl(), d = l.rl(), f = l.rl(), p = l.rl() & 16777215, m = l.rl(), h = l.rl() & 16777215;
	else {
		l.pt3(), d = l.rl(), l.rsu(), l.pt3(), l.pt3(), l.pt2(), l.pt2(), l.pt3(), l.rd(), l.rsu(), l.rd(), l.rsu(), l.rd(), l.rsu(), l.rsu(), l.rsu(), l.rd(), l.rd(), l.rsu(), l.rsu();
		for (let e = 0; e < 128; e++) l.rsu();
		r >= 1 && (l.rd(), l.rd(), r >= 2 && (l.rsu(), l.rsu(), r >= 3 && (l.rsu(), l.rsu()), l.rsu(), l.pt2(), l.rd(), l.rd())), u = l.pos, (!d || d > t.length) && (d = t.length);
	}
	let v = {}, y = [
		"BLOCK",
		"LAYER",
		"STYLE",
		"LTYPE",
		"VIEW",
		"UCS",
		"VPORT",
		"APPID",
		"DIMSTYLE",
		"VX"
	];
	for (let e = 0; e < Math.min(g, y.length); e++) try {
		v[y[e]] = at(l);
	} catch {
		break;
	}
	if (o) for (let [e, n] of [
		["UCS", 1007],
		["VPORT", 1280],
		["APPID", 1298],
		["DIMSTYLE", 1314],
		["VX", 1695]
	]) {
		if (v[e] || n + 10 > t.length) continue;
		let r = new it(t);
		r.pos = n;
		try {
			v[e] = at(r);
		} catch {}
	}
	let b = "ANSI_1252", x = {};
	if (i) try {
		let e = () => {
			let [e, t] = l.pt2();
			return {
				x: e,
				y: t
			};
		};
		x.INSBASE = l.pt3(), a ? x.PLINEGEN = l.rsu() : x.numEntities = l.rsu();
		let t = (e) => [
			e.x,
			e.y,
			e.z ?? 0
		].every((e) => Number.isFinite(e) && Math.abs(e) < 0x8ac7230489e80000), n = l.pt3(), r = l.pt3();
		t(n) && t(r) && (s.header.extMin = n, s.header.extMax = r);
		let i = e(), o = e();
		t(i) && t(o) && (s.header.limMin = i, s.header.limMax = o), x.VIEWCTR = l.pt3(), x.VIEWSIZE = l.rd(), x.SNAPMODE = l.rsu(), x.SNAPUNIT = e(), x.SNAPBASE = e(), x.SNAPANG = l.rd(), x.SNAPSTYLE = l.rsu(), x.SNAPISOPAIR = l.rsu(), x.GRIDMODE = l.rsu(), x.GRIDUNIT = e(), x.ORTHOMODE = l.rsu(), x.REGENMODE = l.rsu(), x.FILLMODE = l.rsu(), x.QTEXTMODE = l.rsu(), x.DRAGMODE = l.rsu(), s.header.linetypeScale = l.rd(), x.TEXTSIZE = l.rd(), x.TRACEWID = l.rd();
		let c = l.rs();
		l.rl(), l.rl(), l.rsu(), a ? (x.PSLTSCALE = l.rsu(), x.TREEDEPTH = l.rsu(), l.rsu()) : (l.rsu(), l.rsu(), l.rsu()), l.rd(), x.LUNITS = l.rsu(), x.LUPREC = l.rsu(), x.AXISMODE = l.rsu(), x.AXISUNIT = e(), x.SKETCHINC = l.rd(), x.FILLETRAD = l.rd(), x.AUNITS = l.rsu(), x.AUPREC = l.rsu();
		let u = l.rs();
		x.OSMODE = l.rsu(), x.ATTMODE = l.rsu(), x.MENU = l.name(15, b);
		for (let e of [
			"DIMSCALE",
			"DIMASZ",
			"DIMEXO",
			"DIMDLI",
			"DIMEXE",
			"DIMTP",
			"DIMTM",
			"DIMTXT",
			"DIMCEN",
			"DIMTSZ"
		]) x[e] = l.rd();
		for (let e of [
			"DIMTOL",
			"DIMLIM",
			"DIMTIH",
			"DIMTOH",
			"DIMSE1",
			"DIMSE2",
			"DIMTAD"
		]) x[e] = l.rc();
		_ > 74 && (x.LIMCHECK = l.rc(), l.pos += 46, x.ELEVATION = l.rd(), x.THICKNESS = l.rd(), x.VIEWDIR = l.pt3(), l.pt3(), l.pt3(), l.pt3(), l.pt3(), l.pt3(), l.pt3(), l.rsu(), x.BLIPMODE = l.rsu()), x.$CLAYER = c, x.$TEXTSTYLE = u;
	} catch {
		c.push("drawing variables could not be read fully.");
	}
	let S = /* @__PURE__ */ new Map(), C = (e, n) => {
		let r = [];
		if (!e || e.count <= 0 || e.size <= 0) return r;
		for (let i = 0; i < e.count; i++) {
			let a = e.address + i * e.size;
			if (a + e.size > t.length) break;
			let o = new it(t);
			o.pos = a;
			try {
				let e = n(o, i);
				e && r.push(e);
			} catch {}
		}
		return r;
	}, w = (e) => {
		let t = e.rc(), n = e.name(32, b);
		return o && e.rs(), {
			flag: t,
			name: n
		};
	}, ee = /* @__PURE__ */ new Map();
	s.layers = C(v.LAYER, (e, t) => {
		let { flag: n, name: r } = w(e);
		if (!r) return null;
		let i = e.rs();
		return ee.set(r, e.rs()), S.set(t, r), {
			name: r,
			color: {
				kind: "aci",
				index: Math.abs(i) || 7
			},
			on: i >= 0,
			frozen: !!(n & 1),
			locked: !!(n & 4)
		};
	}), s.layers.length || (s.layers = e().layers), s.textStyles = C(v.STYLE, (e) => {
		let { name: t } = w(e);
		if (!t) return null;
		let n = e.rd(), i = e.rd();
		e.rd(), e.rc(), e.rd();
		let a = e.name(64, b), o = r >= 8 ? e.name(64, b) : "";
		return {
			name: t,
			font: a || void 0,
			bigFont: o || void 0,
			fixedHeight: n || void 0,
			widthFactor: i === 1 ? void 0 : i
		};
	}), s.textStyles.length || (s.textStyles = [{ name: "Standard" }]);
	let T = /* @__PURE__ */ new Map();
	s.linetypes = C(v.LTYPE, (e, t) => {
		let { name: n } = w(e);
		if (!n) return null;
		let r = e.name(48, b);
		o && (e.rc(), e.rc()), e.rd();
		let i = [];
		for (let t = 0; t < 12; t++) i.push(e.rd());
		for (; i.length && i[i.length - 1] === 0;) i.pop();
		return T.set(t, n), {
			name: n,
			description: r || void 0,
			pattern: i
		};
	}), s.linetypes.length || (s.linetypes = [{
		name: "Continuous",
		description: "Solid line",
		pattern: []
	}]);
	for (let e of s.layers) {
		let t = T.get(ee.get(e.name) ?? -1);
		t && (e.linetype = t);
	}
	let E = v.VIEW?.size ?? 0;
	s.views = C(v.VIEW, (e) => {
		let { name: t } = w(e);
		if (!t) return null;
		let n = e.rd(), [r, i] = e.pt2();
		E === 58 && e.rc();
		let a = E > 58 ? e.rd() : n, o = E > 66 ? e.pt3() : void 0;
		return {
			name: t,
			center: {
				x: r,
				y: i
			},
			height: n,
			width: a,
			direction: o
		};
	}), s.ucs = C(v.UCS, (e) => {
		let { name: t } = w(e);
		return t ? {
			name: t,
			origin: e.pt3(),
			xAxis: e.pt3(),
			yAxis: e.pt3()
		} : null;
	}), s.vports = C(v.VPORT, (e) => {
		let { name: t } = w(e);
		if (!t) return null;
		let [n, r] = e.pt2(), [i, a] = e.pt2(), o = e.pt3(), s = e.pt3();
		e.rd();
		let c = e.rd(), [l, u] = e.pt2(), d = e.rd();
		return {
			name: t,
			lowerLeft: {
				x: n,
				y: r
			},
			upperRight: {
				x: i,
				y: a
			},
			center: {
				x: l,
				y: u
			},
			height: c,
			aspectRatio: d,
			target: o,
			direction: s
		};
	}), s.appIds = C(v.APPID, (e) => w(e).name || null), s.dimStyles = C(v.DIMSTYLE, (e) => {
		let { name: t } = w(e);
		if (!t) return null;
		let n = [
			"DIMSCALE",
			"DIMASZ",
			"DIMEXO",
			"DIMDLI",
			"DIMEXE",
			"DIMRND",
			"DIMDLE",
			"DIMTP",
			"DIMTM",
			"DIMTXT",
			"DIMCEN",
			"DIMTSZ",
			"DIMALTF",
			"DIMLFAC",
			"DIMTVP"
		], r = [
			"DIMTOL",
			"DIMLIM",
			"DIMTIH",
			"DIMTOH",
			"DIMSE1",
			"DIMSE2",
			"DIMTAD",
			"DIMZIN",
			"DIMALT",
			"DIMALTD",
			"DIMTOFL",
			"DIMSAH",
			"DIMTIX",
			"DIMSOXD"
		], i = {};
		for (let t of n) i[t] = e.rd();
		for (let t of r) i[t] = e.rc();
		return i.DIMPOST = e.name(16, b), i.DIMAPOST = e.name(16, b), i.DIMBLK = e.name(16, b), i.DIMBLK1 = e.name(16, b), i.DIMBLK2 = e.name(66, b), i.DIMCLRD = e.rs(), i.DIMCLRE = e.rs(), i.DIMCLRT = e.rs(), i.DIMUPT = e.rc(), i.DIMTFAC = e.rd(), i.DIMGAP = e.rd(), {
			name: t,
			vars: i
		};
	});
	let D = C(v.BLOCK, (e, t) => {
		let { flag: n, name: r } = w(e), i = e.rl() & 1073741823;
		return {
			name: r && n & 1 ? r + t : r,
			base: {
				x: 0,
				y: 0,
				z: 0
			},
			offset: i
		};
	});
	if (Object.keys(x).length) {
		let e = S.get(x.$CLAYER);
		e && (x.CLAYER = e);
		let t = s.textStyles[x.$TEXTSTYLE];
		t && (x.TEXTSTYLE = t.name), delete x.$CLAYER, delete x.$TEXTSTYLE, s.header.vars = x;
	}
	let te = (e) => S.get(e) ?? s.layers[0].name, ne = (e) => {
		if (!i) {
			let t = e.rsu();
			return {
				type: Math.abs(t << 24 >> 24),
				erased: t > 127,
				size: 0,
				flag: 0,
				layerIndex: e.rs(),
				elevation: 0,
				paperSpace: !1,
				opts: 0
			};
		}
		let t = e.rc(), n = t & 127, r = t > 127, s = e.rc(), c = e.rsu();
		if (n === St) return {
			type: n,
			erased: r,
			size: c,
			flag: s,
			layerIndex: 0,
			elevation: 0,
			paperSpace: !1,
			opts: 0
		};
		let l = e.rs(), u = e.rsu(), d = {
			type: n,
			erased: r,
			size: c,
			flag: s,
			layerIndex: l,
			elevation: 0,
			paperSpace: (s & Ft) !== 0,
			opts: u
		}, f = s & Ft ? e.rc() : 0;
		if (f & Lt) {
			let t = e.rsu();
			if (t > 0 && e.pos + t <= e.end) {
				let n = W(e.data.subarray(e.pos, e.pos + t), b);
				n.length && (d.xdata = n), e.pos += t;
			}
		}
		if (s & At && (d.colorIndex = e.rc() << 24 >> 24), s & jt && (d.ltypeIndex = o ? e.rs() : e.rc()), s & Mt && (!a || n !== ot && n !== st && n !== Et && n !== Tt) && (d.elevation = e.rd()), s & Nt && (d.thickness = e.rd()), s & Pt) {
			let t = e.rc() & 15, n = 0;
			for (let r = 0; r < t; r++) n = n * 256 + e.rc();
			n && (d.handle = n.toString(16).toUpperCase());
		}
		return f & Rt && e.rs(), d;
	}, re = (e, t) => {
		if (e.layer = te(t.layerIndex), t.colorIndex !== void 0 && t.colorIndex !== 0) {
			let n = Math.abs(t.colorIndex);
			n >= 1 && n <= 255 && (e.color = {
				kind: "aci",
				index: n
			}), t.colorIndex < 0 && (e.invisible = !0);
		}
		if (t.ltypeIndex !== void 0) {
			let n = T.get(t.ltypeIndex);
			n && (e.linetype = n);
		}
		return t.handle && (e.handle = t.handle), t.xdata && (e.xdata = t.xdata), e;
	}, O = [
		[u, d],
		[f, f + p],
		[m, m + h]
	], k = (e) => {
		let n = e >>> 24, r = n ? (e & 16777215) + (n === 64 ? f : n === 128 ? m : u) : e;
		for (let [e, n] of O) if (r >= e && r < n && n <= t.length) return [r, n];
		return null;
	}, A = /* @__PURE__ */ new Set(), j = (e, n, r, i) => {
		if (e <= 0 || e >= t.length) return;
		let a = Math.min(n, t.length), o = new it(t);
		o.pos = e;
		let c = {
			entities: r,
			pendingPolyline: null,
			pendingInsert: null,
			blockName: null,
			runStart: e
		}, l = 0;
		for (; o.pos < a && l++ < 5e5;) {
			let e = o.pos;
			if (A.has(e)) break;
			A.add(e);
			let t;
			try {
				t = ne(o);
			} catch {
				break;
			}
			if (t.type === 0 || !(t.type in kt)) break;
			if (t.type === St) {
				let e = null;
				try {
					e = k(o.rl());
				} catch {}
				if (!e) break;
				[o.pos, a] = e;
				continue;
			}
			let n = null;
			try {
				n = N(o, t, c, i, e);
			} catch {
				n = {
					type: "unknown",
					layer: "0",
					color: { kind: "byLayer" },
					sourceType: kt[t.type] ?? "TYPE_" + t.type
				};
			}
			if (t.erased && (n = null), n) {
				re(n, t);
				let e = c.blockName ? s.blocks[c.blockName]?.entities ?? r : r;
				t.paperSpace && !c.blockName ? (s.paperSpace ??= []).push(n) : e.push(n);
			}
			if (t.size > 8 && e + t.size <= a) o.pos = e + t.size;
			else if (o.pos <= e) break;
		}
	}, M = (e, t) => {
		let [n, r] = e.pt2();
		return {
			x: n,
			y: r,
			z: t
		};
	}, N = (e, t, n, r, o) => {
		let c = t.opts, l = t.elevation, u = (t.flag & Mt) !== 0, d = {
			layer: "0",
			color: { kind: "byLayer" }
		};
		switch (t.type) {
			case ot: {
				let t = !a || u, n = t ? M(e, l) : e.pt3(), r = t ? M(e, l) : e.pt3();
				return c & 1 && e.pt3(), {
					...d,
					type: "line",
					start: n,
					end: r
				};
			}
			case Tt: {
				let t, n;
				if (a) {
					let r = u;
					t = r ? M(e, 0) : e.pt3(), n = r ? M(e, 0) : e.pt3(), c & 1 && e.pt3();
				} else t = c & 1 ? e.pt3() : M(e, l), n = c & 2 ? e.pt3() : M(e, l);
				return {
					...d,
					type: "line",
					start: t,
					end: n
				};
			}
			case st: {
				let [t, n] = e.pt2(), r = a && !u ? e.rd() : l;
				return c & 1 && e.pt3(), c & 2 && e.rd(), {
					...d,
					type: "point",
					position: {
						x: t,
						y: n,
						z: r
					}
				};
			}
			case ct: {
				let [t, n] = e.pt2(), r = e.rd();
				c & 1 && e.pt3();
				let i = c & 2 ? e.rd() : l;
				return {
					...d,
					type: "circle",
					center: {
						x: t,
						y: n,
						z: i
					},
					radius: r
				};
			}
			case ft: {
				let [t, n] = e.pt2(), r = e.rd(), i = e.rd(), a = e.rd();
				c & 1 && e.pt3();
				let o = c & 2 ? e.rd() : l;
				return {
					...d,
					type: "arc",
					center: {
						x: t,
						y: n,
						z: o
					},
					radius: r,
					startAngle: i,
					endAngle: a
				};
			}
			case pt:
			case ht: {
				let t = [
					e.pt2(),
					e.pt2(),
					e.pt2(),
					e.pt2()
				];
				c & 1 && e.pt3();
				let n = c & 2 ? e.rd() : l;
				return {
					...d,
					type: "solid",
					corners: [
						{
							x: t[0][0],
							y: t[0][1],
							z: n
						},
						{
							x: t[1][0],
							y: t[1][1],
							z: n
						},
						{
							x: t[2][0],
							y: t[2][1],
							z: n
						},
						{
							x: t[3][0],
							y: t[3][1],
							z: n
						}
					]
				};
			}
			case Et: {
				let t;
				if (!a) return t = [
					c & 1 ? e.pt3() : M(e, l),
					c & 2 ? e.pt3() : M(e, l),
					c & 4 ? e.pt3() : M(e, l),
					c & 8 ? e.pt3() : M(e, l)
				], {
					...d,
					type: "face3d",
					corners: t
				};
				t = u ? [
					M(e, 0),
					M(e, 0),
					M(e, 0),
					M(e, 0)
				] : [
					e.pt3(),
					e.pt3(),
					e.pt3(),
					e.pt3()
				];
				let n = {
					...d,
					type: "face3d",
					corners: t
				};
				if (c & 1) {
					let t = e.rs();
					t && (n.invisibleEdges = t);
				}
				return n;
			}
			case dt:
			case bt:
			case yt: {
				let [r, a] = e.pt2(), o = e.rd();
				i || e.rd();
				let u = e.tv(b);
				t.type === yt && e.tv(b), t.type !== dt && (e.tv(b), e.rc());
				let f = t.type === dt ? 0 : 1, p = (e) => c & e << f, m = p(1) ? e.rd() : 0, h = p(2) ? e.rd() : 1, g = p(4) ? e.rd() : 0, _ = p(8) ? e.rc() : -1;
				p(16) && e.rc();
				let v = p(32) ? e.rc() : 0, y = r, x = a;
				p(64) && ([y, x] = e.pt2()), p(128) && e.pt3();
				let S = p(256) ? e.rc() : 0, C = [
					"left",
					"center",
					"right",
					"aligned",
					"middle",
					"fit"
				], w = [
					"baseline",
					"bottom",
					"middle",
					"top"
				], ee = {
					...d,
					type: "text",
					position: {
						x: r,
						y: a,
						z: l
					},
					alignmentPoint: v || S ? {
						x: y,
						y: x,
						z: l
					} : void 0,
					text: u,
					height: o,
					rotation: m,
					widthFactor: Math.abs(h - 1) > 1e-9 ? h : void 0,
					oblique: g || void 0,
					style: _ >= 0 ? s.textStyles[_]?.name : void 0,
					halign: C[v] ?? "left",
					valign: w[S] ?? "baseline"
				};
				return t.type === bt && n.pendingInsert ? (re(ee, t), (n.pendingInsert.attributes ??= []).push(ee), null) : ee;
			}
			case lt: {
				let [t, n] = e.pt2(), r = e.rd(), a = 0, o;
				return i ? (o = e.rc(), c & 1 && (a = e.rd()), c & 2 && e.rc(), c & 4 && e.rd(), c & 8 && e.rd()) : (a = e.rd(), o = e.rs()), {
					...d,
					type: "shape",
					position: {
						x: t,
						y: n,
						z: l
					},
					size: r,
					rotation: a,
					styleId: o
				};
			}
			case gt: {
				let t = "";
				i ? (e.pt2(), c & 2 && e.tv(b), c & 4 && (t = e.tv(b))) : (t = e.tv(b), e.pt2());
				let a = o - n.runStart;
				if (t = D.find((e) => e.name && e.offset === a)?.name ?? t, n.blockName = t || null, t && r && !(t in s.blocks)) {
					let e = D.find((e) => e.name === t);
					s.blocks[t] = {
						name: t,
						basePoint: e?.base ?? {
							x: 0,
							y: 0,
							z: 0
						},
						entities: []
					};
				}
				return null;
			}
			case _t: return n.blockName = null, n.pendingPolyline = null, n.pendingInsert = null, null;
			case xt: return i && e.rl(), n.pendingPolyline = null, n.pendingInsert = null, null;
			case vt: {
				if (!i) {
					let t = e.tv(b), [n, r] = e.pt2(), [i, a] = e.pt2();
					return {
						...d,
						type: "insert",
						blockName: t,
						position: {
							x: n,
							y: r,
							z: l
						},
						scale: {
							x: i,
							y: a,
							z: i
						},
						rotation: e.rd()
					};
				}
				let r = e.rs(), [a, o] = e.pt2(), s = {
					x: 1,
					y: 1,
					z: 1
				};
				c & 1 && (s.x = e.rd()), c & 2 && (s.y = e.rd());
				let u = c & 4 ? e.rd() : 0;
				c & 8 && (s.z = e.rd());
				let f = c & 16 ? e.rsu() : void 0, p = c & 32 ? e.rsu() : void 0, m = c & 64 ? e.rd() : void 0, h = c & 128 ? e.rd() : void 0;
				c & 256 && e.pt3();
				let g = D[r], _ = {
					...d,
					type: "insert",
					blockName: g?.name ?? "",
					position: {
						x: a,
						y: o,
						z: l
					},
					scale: s,
					rotation: u,
					columnCount: f,
					rowCount: p,
					columnSpacing: m,
					rowSpacing: h
				};
				return n.pendingInsert = t.flag & It ? _ : null, _;
			}
			case Ct: {
				let t = c & 1 ? e.rc() : 0;
				c & 2 && e.rd(), c & 4 && e.rd(), c & 8 && e.pt3();
				let r, i;
				if (t & Vt ? (c & 16 && (r = e.rsu()), c & 32 && (i = e.rsu()), c & 64 && e.rs(), c & 128 && e.rs(), c & 256 && e.rs()) : t & Ht ? (c & 16 && (r = e.rsu()), c & 32 && (i = e.rsu())) : (c & 16 && e.rs(), c & 32 && e.rs(), c & 256 && e.rs()), t & 80) {
					let e = {
						...d,
						type: "mesh",
						meshKind: t & Ht ? "faces" : "grid",
						vertices: []
					};
					return t & Vt && (e.mSize = r, e.nSize = i, t & 1 && (e.closedM = !0), t & 32 && (e.closedN = !0)), n.pendingPolyline = {
						kind: t & Ht ? "pface" : "mesh",
						mesh: e,
						verts: []
					}, e;
				}
				let a = {
					...d,
					type: "polyline",
					vertices: [],
					closed: (t & zt) !== 0,
					elevation: t & Bt ? void 0 : l || void 0
				};
				return n.pendingPolyline = {
					kind: "polyline",
					poly: a,
					verts: a.vertices
				}, a;
			}
			case wt: {
				let t = c & 16384 ? null : e.pt2(), r = c & 1 ? e.rd() : 0, i = c & 2 ? e.rd() : 0, a = c & 4 ? e.rd() : 0, o = c & 8 ? e.rc() : 0;
				c & 16 && e.rd();
				let s = [];
				c & 32 && s.push(e.rs()), c & 64 && s.push(e.rs()), c & 128 && s.push(e.rs()), c & 256 && s.push(e.rs());
				let u = n.pendingPolyline;
				if (!u) return null;
				if (u.mesh) {
					if (o & U && !(o & Ut)) {
						let e = s.filter((e) => e !== 0);
						e.length && (u.mesh.faces ??= []).push(e);
					} else t && u.mesh.vertices.push({
						x: t[0],
						y: t[1],
						z: l
					});
					return null;
				}
				if (t) {
					let e = {
						x: t[0],
						y: t[1]
					};
					r && (e.startWidth = r), i && (e.endWidth = i), a && (e.bulge = a), u.verts.push(e);
				}
				return null;
			}
			case Dt: {
				let t = D[e.rs()], n = a ? e.pt3() : M(e, l), [r, i] = e.pt2(), o = {
					...d,
					type: "dimension",
					dimensionType: 0,
					definitionPoint: n,
					textMidpoint: {
						x: r,
						y: i,
						z: l
					},
					elevation: l || void 0,
					blockName: t?.name
				};
				c & 1 && (o.insertionPoint = M(e, l));
				let f = c & 2 ? e.rc() : 0;
				c & 4 && (o.text = e.tv(b));
				let p = f & 15;
				o.kind = [
					"linear",
					"aligned",
					"angular2ln",
					"diameter",
					"radius",
					"angular3pt",
					"ordinate"
				][p], o.dimensionType = p, f & 128 && (o.dimensionType |= 128);
				let m = () => a ? e.pt3() : M(e, l);
				switch (p) {
					case 0:
						c & 8 && (o.point13 = m()), c & 16 && (o.point14 = m()), c & 256 && (o.rotation = e.rd()), c & 512 && (o.obliqueAngle = e.rd()), c & 1024 && (o.textRotation = e.rd()), c & 16384 && e.pt3();
						break;
					case 1:
						c & 8 && (o.point13 = m()), c & 16 && (o.point14 = m()), c & 256 && (o.obliqueAngle = e.rd()), c & 1024 && (o.textRotation = e.rd());
						break;
					case 2:
						c & 8 && (o.point13 = m()), c & 16 && (o.point14 = m()), c & 32 && (o.point15 = m()), c & 64 && (o.point16 = M(e, l)), c & 1024 && (o.textRotation = e.rd());
						break;
					case 3:
					case 4:
						c & 32 && (o.point15 = a && !(p === 3 && u) ? e.pt3() : M(e, l)), c & 128 && (o.leaderLength = e.rd()), c & 1024 && (o.textRotation = e.rd()), c & 16384 && e.pt3();
						break;
					case 5:
						c & 8 && (o.point13 = m()), c & 16 && (o.point14 = m()), c & 32 && (o.point15 = m()), c & 64 && (o.point16 = M(e, l)), c & 1024 && (o.textRotation = e.rd());
						break;
					case 6: c & 8 && (o.point13 = m()), c & 16 && (o.point14 = m()), f & 64 && (o.dimensionType |= 64), c & 1024 && (o.textRotation = e.rd());
				}
				if (c & 32768) {
					let t = s.dimStyles?.[e.rs()];
					t && (o.style = t.name);
				}
				return o;
			}
			case Ot: {
				let t = e.pt3(), n = e.rd(), r = e.rd(), i = e.rs();
				return {
					...d,
					type: "viewport",
					center: t,
					width: n,
					height: r,
					statusFlag: i
				};
			}
			case ut: return e.rsu(), e.rsu(), e.rd(), e.rd(), {
				...d,
				type: "unknown",
				sourceType: "ENDREP"
			};
			case mt: return e.tv(b), {
				...d,
				type: "unknown",
				sourceType: "LOAD"
			};
			default: return {
				...d,
				type: "unknown",
				sourceType: kt[t.type] ?? "TYPE_" + t.type
			};
		}
	};
	try {
		j(u, d, s.entities, !i);
	} catch (e) {
		c.push("entity section: " + (e instanceof Error ? e.message : String(e)));
	}
	try {
		f && p && j(f, f + p, s.entities, !0);
	} catch {
		c.push("block section could not be read fully.");
	}
	try {
		m && h && j(m, m + h, s.entities, !1);
	} catch {
		c.push("extras section could not be read fully.");
	}
	s.entities = s.entities.filter((e) => e.type !== "polyline" || e.vertices.length >= 2);
	for (let e of Object.values(s.blocks)) e.entities = e.entities.filter((e) => e.type !== "polyline" || e.vertices.length >= 2);
	let P = /* @__PURE__ */ new Map();
	for (let e of s.entities) e.type === "unknown" && P.set(e.sourceType, (P.get(e.sourceType) ?? 0) + 1);
	for (let [e, t] of P) c.push(`${t} ${e} entit${t === 1 ? "y" : "ies"} kept without geometry (not modeled yet).`);
	return s;
}, Gt = /* @__PURE__ */ new Set([
	"DICTIONARY",
	"ACDBDICTIONARYWDFLT",
	"XRECORD",
	"DICTIONARYVAR",
	"BLOCKVISIBILITYPARAMETER",
	"BLOCKLINEARPARAMETER",
	"BLOCKROTATIONPARAMETER",
	"BLOCKFLIPPARAMETER",
	"BLOCKALIGNMENTPARAMETER",
	"BLOCKBASEPOINTPARAMETER",
	"BLOCKXYPARAMETER",
	"BLOCKPOLARPARAMETER",
	"BLOCKPOINTPARAMETER",
	"BLOCKLOOKUPPARAMETER",
	"BLOCKMOVEACTION",
	"BLOCKROTATEACTION",
	"BLOCKSCALEACTION",
	"BLOCKSTRETCHACTION",
	"BLOCKPOLARSTRETCHACTION",
	"BLOCKFLIPACTION",
	"BLOCKARRAYACTION",
	"BLOCKLOOKUPACTION"
]), G = /* @__PURE__ */ new Set([
	"POLYLINE_2D",
	"POLYLINE_3D",
	"BLOCK",
	"ENDBLK",
	"SEQEND"
]), Kt = /* @__PURE__ */ new Set(["ACDBPLACEHOLDER"]), qt = Object.freeze({ kind: "byLayer" }), Jt = Object.freeze({ kind: "byBlock" }), Yt = Object.freeze(Array.from({ length: 256 }, (e, t) => Object.freeze({
	kind: "aci",
	index: t
}))), Xt = (e, t, n, r) => ({
	version: e,
	v: i(e),
	codepage: n,
	classes: t,
	dwgVerByte: r
}), Zt = (e) => {
	let t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", n = "";
	for (let r = 0; r < e.length; r += 3) {
		let i = e[r], a = e[r + 1], o = e[r + 2];
		n += t[i >> 2] + t[(i & 3) << 4 | (a ?? 0) >> 4] + (r + 1 < e.length ? t[((a ?? 0) & 15) << 2 | (o ?? 0) >> 6] : "=") + (r + 2 < e.length ? t[(o ?? 0) & 63] : "=");
	}
	return n;
}, Qt = {
	1: "TEXT",
	2: "ATTRIB",
	3: "ATTDEF",
	4: "BLOCK",
	5: "ENDBLK",
	6: "SEQEND",
	7: "INSERT",
	8: "MINSERT",
	10: "Vertex2d",
	11: "Vertex3d",
	12: "VertexMesh",
	13: "VertexPFace",
	14: "PFaceFace",
	15: "Polyline2d",
	16: "Polyline3d",
	17: "ARC",
	18: "CIRCLE",
	19: "LINE",
	20: "DimOrdinate",
	21: "DimRotated",
	22: "DimAligned",
	23: "DimAngular3Point",
	24: "DimAngular2Line",
	25: "DimRadius",
	26: "DimDiameter",
	27: "POINT",
	28: "3DFACE",
	29: "PolylinePFace",
	30: "PolylineMesh",
	31: "SOLID",
	32: "TRACE",
	33: "SHAPE",
	34: "VIEWPORT",
	35: "ELLIPSE",
	36: "SPLINE",
	37: "REGION",
	38: "3DSOLID",
	39: "BODY",
	40: "RAY",
	41: "XLINE",
	42: "DICTIONARY",
	43: "OLEFRAME",
	44: "MTEXT",
	45: "LEADER",
	46: "TOLERANCE",
	47: "MLINE",
	48: "BlockTable",
	49: "BlockRecord",
	50: "LayerTable",
	51: "LAYER",
	52: "TextStyleTable",
	53: "STYLE",
	56: "LinetypeTable",
	57: "LTYPE",
	60: "ViewTable",
	61: "VIEW",
	62: "UcsTable",
	63: "UCS",
	64: "VPortTable",
	65: "VPORT",
	66: "AppIdTable",
	67: "APPID",
	68: "DimStyleTable",
	69: "DIMSTYLE",
	70: "VxTable",
	71: "VX",
	72: "GROUP",
	73: "MLINESTYLE",
	74: "OLE2FRAME",
	77: "LWPOLYLINE",
	78: "HATCH",
	79: "XRECORD",
	80: "ACDBPLACEHOLDER",
	81: "VBA_PROJECT",
	82: "LAYOUT",
	498: "ACAD_PROXY_ENTITY",
	499: "ACAD_PROXY_OBJECT"
}, $t = (e) => e >= 1 && e <= 47 && e !== 42 && e !== 43 || e === 74 || e === 77 || e === 78 || e === 498, en = /* @__PURE__ */ new Set([
	48,
	50,
	52,
	56,
	60,
	62,
	64,
	66,
	68,
	70
]), tn = (e) => e < 0 ? "handle" : e <= 9 ? "string" : e <= 37 ? "point" : e <= 59 ? "real" : e <= 79 ? "int16" : e <= 99 ? "int32" : e <= 102 || e === 105 ? "string" : e <= 109 ? "invalid" : e <= 139 ? "point" : e <= 149 ? "real" : e <= 169 ? "int64" : e <= 179 ? "int16" : e <= 209 ? "invalid" : e <= 269 ? "point" : e <= 279 ? "int16" : e <= 289 ? "int8" : e <= 299 ? "bool" : e <= 309 ? "string" : e <= 319 ? "binary" : e <= 329 || e <= 369 ? "handle" : e <= 389 ? "int16" : e <= 399 ? "handle" : e <= 409 ? "int16" : e <= 419 ? "string" : e <= 429 ? "int32" : e <= 439 ? "string" : e <= 459 ? "int32" : e <= 469 ? "real" : e <= 479 || e === 999 ? "string" : e < 1e3 ? "invalid" : e === 1004 ? "binary" : e <= 1009 ? "string" : e <= 1039 ? "point" : e <= 1042 ? "real" : e <= 1069 ? "point" : e <= 1070 ? "int16" : e === 1071 ? "int32" : "invalid", nn = [
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
], rn = (e) => e >= 0 && e < 24 ? nn[e] : void 0, an = (e, t) => {
	let n = [];
	for (;;) {
		let r = e.bs();
		if (r <= 0) break;
		let i = e.h(), a = e.bytes(r), o = {
			appHandle: i.value.toString(16).toUpperCase(),
			values: []
		};
		try {
			let e = new z(a);
			for (; e.pos + 8 <= a.length * 8;) {
				let n = e.rc();
				if (n === 0) {
					if (t.v >= 2007) {
						let t = e.rs(), n = "";
						for (let r = 0; r < t; r++) n += String.fromCharCode(e.rs());
						o.values.push({
							code: 1e3,
							value: n
						});
					} else {
						let n = e.rc();
						e.rs(), o.values.push({
							code: 1e3,
							value: Ve(e.bytes(n), t.codepage)
						});
					}
				} else if (n === 2) o.values.push({
					code: 1002,
					value: e.rc() ? "}" : "{"
				});
				else if (n === 3 || n === 5) {
					let t = 0;
					for (let n = 0; n < 8; n++) t = t * 256 + e.rc();
					o.values.push({
						code: n === 3 ? 1003 : 1005,
						value: t.toString(16).toUpperCase()
					});
				} else if (n === 4) {
					let t = e.rc(), n = "";
					for (let r = 0; r < t; r++) n += e.rc().toString(16).padStart(2, "0").toUpperCase();
					o.values.push({
						code: 1004,
						value: n
					});
				} else if (n >= 10 && n <= 13) o.values.push({
					code: 1e3 + n,
					point: {
						x: e.rd(),
						y: e.rd(),
						z: e.rd()
					}
				});
				else if (n >= 40 && n <= 42) o.values.push({
					code: 1e3 + n,
					value: e.rd()
				});
				else if (n === 70) {
					let t = e.rs();
					o.values.push({
						code: 1070,
						value: t >= 32768 ? t - 65536 : t
					});
				} else if (n === 71) {
					let t = e.rl();
					o.values.push({
						code: 1071,
						value: t > 2147483647 ? t - 4294967296 : t
					});
				} else break;
			}
		} catch {}
		n.push(o);
	}
	return n.length ? n : void 0;
}, K = (e, t, n) => ({
	x: e,
	y: t,
	z: n
}), q = (e) => {
	let [t, n, r] = e;
	if (!(Math.abs(t) < 1e-12 && Math.abs(n) < 1e-12 && Math.abs(r - 1) < 1e-12) && isFinite(t) && isFinite(n) && isFinite(r) && (t || n || r)) return K(t, n, r);
}, on = (e) => {
	let t = {
		x: 0,
		y: 0,
		z: 0
	}, n = [];
	if (e && e.length >= 98) {
		let t = new DataView(e.buffer, e.byteOffset, e.byteLength);
		for (let e = 0; e < 4; e++) {
			let r = 2 + e * 24;
			n.push({
				x: t.getFloat64(r, !0),
				y: t.getFloat64(r + 8, !0),
				z: t.getFloat64(r + 16, !0)
			});
		}
	}
	for (; n.length < 4;) n.push({ ...t });
	return n;
}, sn = (e, t) => {
	if (t < 17) return null;
	let n = new z(e, t - 1);
	if (!n.b()) return null;
	n.pos = t - 1 - 16;
	let r = n.rs(), i = 16;
	if (r & 32768) {
		n.pos = t - 1 - 32;
		let e = n.rs();
		r = r & 32767 | e << 15, i = 32;
	}
	let a = t - 1 - i - r;
	return a < 0 ? null : {
		r: new z(e, a, t - 1),
		bits: r
	};
}, cn = (e) => e <= 14 ? 14 : e >= 2010 ? 2018 : e, ln = class {
	c;
	r;
	sr;
	hr;
	dataEnd;
	srStart = 0;
	srBits = 0;
	constructor(e, t, n, r, i = 0) {
		this.c = e, this.r = t, this.sr = r, this.hr = n, this.dataEnd = i;
	}
	get v() {
		return this.c.v;
	}
	text() {
		return we(this.v >= 2007 && this.sr ? this.sr.tu() : Ve(this.r.tBytes(), this.c.codepage));
	}
	handle(e) {
		return this.hr.hAbs(e);
	}
	entityColor() {
		if (this.v < 2004) return this.indexColor(this.r.bs());
		let e = this.r.bs() & 65535, t = e >> 8, n = e & 511, r = null;
		return t & 32 && this.r.bl(), t & 64 ? this.hr.h() : t & 128 && (r = this.r.bl() & 16777215), (t & 65) == 65 && this.text(), (t & 66) == 66 && this.text(), r === null ? this.indexColor(n) : {
			kind: "rgb",
			rgb: r
		};
	}
	cmc(e = !1) {
		let t = this.r.bs();
		if (this.v < 2004 && !e) return {
			color: this.indexColor(t),
			index: t
		};
		let n = this.r.bl() >>> 0, r = this.r.rc();
		r & 1 && this.text(), r & 2 && this.text();
		let i = n >>> 24 & 255;
		return i === 194 ? {
			color: {
				kind: "rgb",
				rgb: n & 16777215
			},
			index: t
		} : i === 195 ? {
			color: this.indexColor(n & 255),
			index: n & 255
		} : i === 193 ? {
			color: Jt,
			index: 0
		} : i === 192 ? {
			color: qt,
			index: 256
		} : {
			color: this.indexColor(t),
			index: t
		};
	}
	indexColor(e) {
		return e === 256 || e === -1 ? qt : e === 0 ? Jt : Yt[Math.abs(e) & 255];
	}
	xdata;
	hasDsData = !1;
	proxyGraphics;
	commonEntity() {
		let { r: e, v: t } = this, n = e.hValue();
		if (this.selfHandle = n, this.xdata = an(e, this.c), e.b()) {
			let n = t <= 2007 ? e.rl() : e.bll(), r = e.bytes(n);
			n > 8 && n < 67108864 && (this.proxyGraphics = r);
		}
		if (t <= 14) {
			let t = e.rl();
			this.hr = new z(e.data, t, this.hr.endBit), this.dataEnd = t;
		}
		let r = e.bb(), i = e.bl(), a = !1, o = !1, s = 0;
		t <= 14 && (s = e.b() === 1 ? 0 : 3), t >= 2004 && (o = e.b() === 1), t <= 2002 && (a = e.b() === 1), t >= 2013 && (this.hasDsData = e.b() === 1);
		let c = this.entityColor(), l = e.bd(), u = 0;
		t >= 2e3 && (s = e.bb(), u = e.bb());
		let d = 0, f = 0;
		t >= 2007 && (d = e.bb(), f = e.rc());
		let p = [
			!1,
			!1,
			!1
		];
		t >= 2010 && (p[0] = e.b() === 1, p[1] = e.b() === 1, p[2] = e.b() === 1);
		let m = (e.bs() & 1) == 1, h = t >= 2e3 ? rn(e.rc()) : void 0, g = this.hr, _ = {
			handle: n,
			entmode: r,
			numReactors: i,
			nolinks: a,
			xdicMissing: o,
			color: c,
			ltypeScale: l,
			ltypeFlags: s,
			plotstyleFlags: u,
			materialFlags: d,
			invisible: m,
			lineweight: h,
			visFlags: p,
			shadowFlags: f
		};
		if (r === 0 && (this.ownerHandle = this.handle(n)), i > 0 && i < 1e5) {
			let e = [];
			for (let t = 0; t < i; t++) e.push(this.handle(n));
			this.reactors = e;
		} else for (let e = 0; e < i; e++) g.h();
		if ((t < 2004 || !o) && (this.xdictHandle = this.handle(n)), t <= 14) return this.layerHandle = this.handle(n), s === 3 && (this.ltypeHandle = this.handle(n)), a || (this.prevHandle = this.handle(n), this.nextHandle = this.handle(n)), _;
		if (t <= 2e3 && !a && (this.prevHandle = this.handle(n), this.nextHandle = this.handle(n)), this.layerHandle = this.handle(n), s === 3 && (this.ltypeHandle = this.handle(n)), t >= 2007 && (d === 3 && g.h(), f === 3 && g.h()), u === 3 && g.h(), t >= 2010) for (let e of p) e && g.h();
		return _;
	}
	ownerHandle;
	xdictHandle = 0;
	reactors;
	prevHandle;
	nextHandle;
	layerHandle;
	ltypeHandle;
	selfHandle = 0;
	styleHandle;
	numReactors = 0;
	xdicMissing = !1;
	commonObject(e) {
		let { r: t, v: n } = this, r = t.hValue();
		if (this.xdata = an(t, this.c), n <= 14) {
			let e = t.rl();
			this.hr = new z(t.data, e, this.hr.endBit), this.dataEnd = e;
		}
		if (this.numReactors = t.bl(), this.xdicMissing = n >= 2004 && t.b() === 1, n >= 2013 && t.b(), !e) {
			if (this.ownerHandle = this.handle(r), this.numReactors > 0 && this.numReactors < 1e5) {
				let e = [];
				for (let t = 0; t < this.numReactors; t++) e.push(this.handle(r));
				this.reactors = e;
			} else for (let e = 0; e < this.numReactors; e++) this.hr.h();
			(n < 2004 || !this.xdicMissing) && (this.xdictHandle = this.handle(r));
		}
		return { handle: r };
	}
	tableFlags() {
		let e = this.text(), t = !1;
		this.v <= 2004 ? (this.r.b(), this.r.bs(), t = this.r.b() === 1) : this.r.bs();
		let n = this.hr.h();
		return this.lastXrefDependent = t || n.value > 0, e;
	}
	lastXrefDependent = !1;
}, un = [
	"left",
	"center",
	"right",
	"aligned",
	"middle",
	"fit"
], dn = [
	"baseline",
	"bottom",
	"middle",
	"top"
], fn = (e, t, n) => {
	let { r, v: i } = e, a = () => {
		let a = !0;
		try {
			i >= 2010 && r.rc(), i >= 2018 && (a = r.rc() <= 1);
		} catch {
			a = !1;
		}
		let o = e.text();
		if (n && t === "attdef" && o && (n.attTag = o), !a) return 0;
		try {
			return r.bs(), r.rc();
		} catch {
			return 0;
		}
	}, o = (e) => {
		if (t === "text") return e;
		let n = e;
		n.attribute = t;
		let r = a();
		return r & 1 && (n.invisible = !0), r & 2 && (n.constant = !0), n;
	};
	if (e.v <= 14) {
		let t = r.bd(), [n, i] = r.rd2(), [a, s] = r.rd2(), c = q(r.bd3());
		r.bd();
		let l = r.bd(), u = r.bd(), d = r.bd(), f = r.bd(), p = e.text();
		r.bs();
		let m = r.bs(), h = r.bs(), g = o({
			type: "text",
			layer: "0",
			color: { kind: "byLayer" },
			position: K(n, i, t),
			alignmentPoint: m || h ? K(a, s, t) : void 0,
			text: p,
			height: d,
			rotation: u,
			widthFactor: f === 1 ? void 0 : f,
			oblique: l || void 0,
			halign: un[m] ?? "left",
			valign: dn[h] ?? "baseline",
			...c ? { extrusion: c } : {}
		});
		return e.styleHandle = e.handle(e.selfHandle), g;
	}
	let s = r.rc(), c = s & 1 ? 0 : r.rd(), [l, u] = r.rd2(), d = l, f = u;
	s & 2 || (d = r.dd(l), f = r.dd(u));
	let p = q(r.be());
	r.bt();
	let m = s & 4 ? 0 : r.rd(), h = s & 8 ? 0 : r.rd(), g = r.rd(), _ = s & 16 ? 1 : r.rd(), v = e.text();
	s & 32 || r.bs();
	let y = s & 64 ? 0 : r.bs(), b = s & 128 ? 0 : r.bs(), x = o({
		type: "text",
		layer: "0",
		color: { kind: "byLayer" },
		position: K(l, u, c),
		alignmentPoint: y || b ? K(d, f, c) : void 0,
		text: v,
		height: g,
		rotation: h,
		widthFactor: _ === 1 ? void 0 : _,
		oblique: m || void 0,
		halign: un[y] ?? "left",
		valign: dn[b] ?? "baseline",
		...p ? { extrusion: p } : {}
	});
	return e.styleHandle = e.handle(e.selfHandle), x;
}, J = (e) => {
	let { r: t } = e, n = Math.max(t.pos, Math.min(e.dataEnd, t.endBit)) - t.pos, r = new Uint8Array(n + 7 >> 3);
	for (let e = 0; e < n; e++) t.b() && (r[e >> 3] |= 128 >> (e & 7));
	let i = [];
	try {
		let t = e.hr;
		for (; t.pos + 8 <= t.endBit;) {
			let e = t.h();
			i.push({
				code: e.code,
				value: e.value.toString(16).toUpperCase()
			});
		}
	} catch {}
	for (; i.length && i[i.length - 1].code === 0 && i[i.length - 1].value === "0";) i.pop();
	return {
		blob: r,
		nbits: n,
		refs: i.length ? i : void 0
	};
}, pn = (e) => {
	let { blob: t, nbits: n, refs: r } = J(e);
	return {
		data: n > 0 ? Zt(t) : void 0,
		dataBits: n > 0 ? n : void 0,
		refs: r
	};
}, mn = (e) => {
	let { r: t, v: n } = e;
	n >= 2004 && t.rs();
	let r = t.rl(), i = new Uint8Array(r + 7 >> 3);
	for (let e = 0; e < r; e++) t.b() && (i[e >> 3] |= 128 >> (e & 7));
	let a = t.rl(), o = new Uint8Array(a + 7 >> 3);
	for (let e = 0; e < a; e++) t.b() && (o[e >> 3] |= 128 >> (e & 7));
	return {
		dataBits: r,
		blob: i,
		strBits: a,
		strBlob: o
	};
}, hn = (e) => ({
	dxfName: e.dxfName,
	cppName: e.cppName,
	appName: e.appName,
	...e.dwgVersion === void 0 ? {} : {
		dwgVersion: e.dwgVersion,
		maintVersion: e.maintVersion
	}
}), Y = (e, t, n) => {
	let r = new Uint8Array(n + 7 >> 3), i = new z(e, t, t + n);
	for (let e = 0; e < n; e++) i.b() && (r[e >> 3] |= 128 >> (e & 7));
	return r;
}, gn = (e) => {
	let { r: t, v: n } = e, r = t.bl(), i = !1;
	if (n === 2004) {
		let e = t.pos, n = !1;
		try {
			let e = t.bs();
			if (n = e >= 3 && e < 256 && t.rc() === 99 && t.rc() === 110 && t.rc() === 58, n) for (let n = 3; n < e; n++) t.rc();
		} catch {}
		n || (t.pos = e);
	}
	let a = t.bl();
	return (a & 4294901760) >>> 0 == 1314062336 && (i = !0), {
		classId: r,
		proxyVersion: a,
		proxyMaint: n >= 2018 ? t.bl() : void 0,
		fromDxf: n >= 2e3 ? t.b() === 1 : void 0,
		magic: i
	};
}, _n = (e) => e === 23 ? 2e3 : e === 25 ? 2004 : e === 27 ? 2007 : e === 29 || e === 31 || e === 33 ? 2018 : void 0, vn = (e) => e.v < 2007 || !e.sr || e.srBits <= 0 ? {} : {
	strData: Zt(Y(e.r.data, e.srStart, e.srBits)),
	strBits: e.srBits
}, yn = (e, t) => {
	let n = _n(t);
	if (n === void 0 || n === cn(e.v)) return null;
	let { blob: r, nbits: i, refs: a } = J(e), o = {
		encoding: n,
		data: i > 0 ? Zt(r) : void 0,
		dataBits: i > 0 ? i : void 0,
		refs: a
	};
	if (n < 2007) return o;
	if (e.v >= 2007) {
		if (e.sr && e.srBits > 0) {
			let t = new z(e.r.data, e.srStart, e.srStart + e.srBits), n = t.bs();
			for (let e = 0; e < n; e++) t.rs();
			let r = e.srStart + e.srBits - t.pos;
			r > 0 && (o.strData = Zt(Y(e.r.data, t.pos, r)), o.strBits = r);
		}
		return o;
	}
	if (i <= 0) return o;
	let s = (e) => r[e >> 3] >> 7 - (e & 7) & 1, c = (e) => new z(r, e, e + 16).rs();
	if (!s(i - 1)) return o.data = i > 1 ? Zt(Y(r, 0, i - 1)) : void 0, o.dataBits = i > 1 ? i - 1 : void 0, o;
	if (i < 17) return o;
	let l = c(i - 17), u = 16;
	if (l & 32768) {
		if (i < 33) return o;
		l = l & 32767 | c(i - 33) << 15, u = 32;
	}
	let d = i - 1 - u - l;
	return d < 0 ? o : (o.data = d > 0 ? Zt(Y(r, 0, d)) : void 0, o.dataBits = d > 0 ? d : void 0, o.strData = l > 0 ? Zt(Y(r, d, l)) : void 0, o.strBits = l > 0 ? l : void 0, o);
}, bn = (e) => {
	let t = pn(e);
	if (e.sr && e.srBits > 0) {
		let n = new z(e.r.data, e.srStart, e.srStart + e.srBits), r = new Uint8Array(e.srBits + 7 >> 3);
		for (let t = 0; t < e.srBits; t++) n.b() && (r[t >> 3] |= 128 >> (t & 7));
		t.strData = Zt(r), t.strBits = e.srBits;
	}
	return t;
}, xn = (e, t, n) => {
	let { r, v: i } = e;
	switch (t) {
		case "TEXT": return fn(e, "text");
		case "ATTRIB": return fn(e, "attrib");
		case "ATTDEF": return fn(e, "attdef", n);
		case "LINE": {
			if (i >= 2e3) {
				let e = r.b(), t = r.rd(), n = r.dd(t), i = r.rd(), a = r.dd(i), o = 0, s = 0;
				e || (o = r.rd(), s = r.dd(o)), r.bt();
				let c = q(r.be());
				return {
					type: "line",
					layer: "0",
					color: { kind: "byLayer" },
					start: K(t, i, o),
					end: K(n, a, s),
					...c ? { extrusion: c } : {}
				};
			}
			let [e, t, n] = r.bd3(), [a, o, s] = r.bd3(), c;
			return i <= 14 ? (r.bd(), c = q(r.bd3())) : (r.bt(), c = q(r.be())), {
				type: "line",
				layer: "0",
				color: { kind: "byLayer" },
				start: K(e, t, n),
				end: K(a, o, s),
				...c ? { extrusion: c } : {}
			};
		}
		case "POINT": {
			let e = r.bd(), t = r.bd(), n = r.bd(), a = i <= 14 ? (r.bd(), q(r.bd3())) : (r.bt(), q(r.be()));
			return r.bd(), {
				type: "point",
				layer: "0",
				color: { kind: "byLayer" },
				position: K(e, t, n),
				...a ? { extrusion: a } : {}
			};
		}
		case "CIRCLE": {
			let [e, t, n] = r.bd3(), a = r.bd();
			i <= 14 ? r.bd() : r.bt();
			let o = q(i <= 14 ? r.bd3() : r.be());
			return {
				type: "circle",
				layer: "0",
				color: { kind: "byLayer" },
				center: K(e, t, n),
				radius: a,
				...o ? { extrusion: o } : {}
			};
		}
		case "ARC": {
			let [e, t, n] = r.bd3(), a = r.bd();
			i <= 14 ? r.bd() : r.bt();
			let o = q(i <= 14 ? r.bd3() : r.be()), s = r.bd(), c = r.bd();
			return {
				type: "arc",
				layer: "0",
				color: { kind: "byLayer" },
				center: K(e, t, n),
				radius: a,
				startAngle: s,
				endAngle: c,
				...o ? { extrusion: o } : {}
			};
		}
		case "ELLIPSE": {
			let [e, t, n] = r.bd3(), [i, a, o] = r.bd3(), s = q(r.bd3()), c = r.bd(), l = r.bd(), u = r.bd();
			return {
				type: "ellipse",
				layer: "0",
				color: { kind: "byLayer" },
				center: K(e, t, n),
				majorAxis: K(i, a, o),
				ratio: c,
				startParam: l,
				endParam: u,
				...s ? { extrusion: s } : {}
			};
		}
		case "RAY":
		case "XLINE": {
			let [e, n, i] = r.bd3(), [a, o, s] = r.bd3();
			return {
				type: t === "RAY" ? "ray" : "xline",
				layer: "0",
				color: { kind: "byLayer" },
				basePoint: K(e, n, i),
				direction: K(a, o, s)
			};
		}
		case "SOLID":
		case "TRACE": {
			i <= 14 ? r.bd() : r.bt();
			let e = r.bd(), t = r.rd2(), n = r.rd2(), a = r.rd2(), o = r.rd2(), s = q(i <= 14 ? r.bd3() : r.be());
			return {
				type: "solid",
				layer: "0",
				color: { kind: "byLayer" },
				corners: [
					K(t[0], t[1], e),
					K(n[0], n[1], e),
					K(a[0], a[1], e),
					K(o[0], o[1], e)
				],
				...s ? { extrusion: s } : {}
			};
		}
		case "SPLINE": {
			let e = r.bl();
			if (i >= 2013) {
				let t = r.bl();
				r.bl(), e = t & 1 ? 2 : 1;
			}
			let t = r.bl();
			if (e & 1) {
				r.b();
				let e = r.b();
				r.b(), r.bd(), r.bd();
				let n = r.bl(), i = r.bl(), a = r.b();
				if (n > 1e5 || i > 1e5) return null;
				let o = [];
				for (let e = 0; e < n; e++) o.push(r.bd());
				let s = [], c = [];
				for (let e = 0; e < i; e++) {
					let [e, t, n] = r.bd3();
					s.push(K(e, t, n)), a && c.push(r.bd());
				}
				return {
					type: "spline",
					layer: "0",
					color: { kind: "byLayer" },
					degree: t,
					closed: e === 1,
					controlPoints: s,
					knots: o,
					weights: a ? c : void 0
				};
			}
			r.bd(), r.bd3(), r.bd3();
			let n = r.bl();
			if (n > 1e5) return null;
			let a = [];
			for (let e = 0; e < n; e++) {
				let [e, t, n] = r.bd3();
				a.push(K(e, t, n));
			}
			return {
				type: "spline",
				layer: "0",
				color: { kind: "byLayer" },
				degree: t,
				closed: !1,
				controlPoints: [],
				knots: [],
				fitPoints: a
			};
		}
		case "LWPOLYLINE": {
			let e = r.bs(), t = e & 4 ? r.bd() : void 0, n = e & 8 ? r.bd() : 0;
			e & 2 && r.bd();
			let a = e & 1 ? q(r.bd3()) : void 0, o = r.bl();
			if (o > 1e5) return null;
			let s = e & 16 ? r.bl() : 0, c = i >= 2010 && e & 1024 ? r.bl() : 0, l = e & 32 ? r.bl() : 0, u = [], d = 0, f = 0;
			for (let e = 0; e < o; e++) e === 0 || i <= 14 ? (d = r.rd(), f = r.rd()) : (d = r.dd(d), f = r.dd(f)), u.push({
				x: d,
				y: f
			});
			for (let e = 0; e < s; e++) {
				let t = r.bd();
				u[e] && t && (u[e].bulge = t);
			}
			for (let e = 0; e < c; e++) {
				let t = r.bl();
				u[e] && t && (u[e].id = t);
			}
			for (let e = 0; e < l; e++) {
				let t = r.bd(), n = r.bd();
				u[e] && (t && (u[e].startWidth = t), n && (u[e].endWidth = n));
			}
			return {
				type: "polyline",
				layer: "0",
				color: { kind: "byLayer" },
				vertices: u,
				closed: !!(e & 512),
				constantWidth: t,
				elevation: n || void 0,
				...e & 256 ? { plineGen: !0 } : {},
				...a ? { extrusion: a } : {}
			};
		}
		case "MTEXT": {
			let [t, n, a] = r.bd3(), o = q(r.bd3()), [s, c] = [r.bd(), r.bd()];
			r.bd();
			let l = r.bd();
			i >= 2007 && r.bd();
			let u = r.bd(), d = r.bs();
			r.bs(), r.bd(), r.bd();
			let f = e.text();
			e.styleHandle = e.handle(e.selfHandle), i >= 2e3 && (r.bs(), r.bd(), r.b()), i >= 2004 && r.bl() & (i <= 2018 ? 1 : 16) && (r.bd(), e.cmc(), r.bl());
			let p = Math.atan2(c, s);
			return {
				type: "mtext",
				layer: "0",
				color: { kind: "byLayer" },
				position: K(t, n, a),
				text: f.replace(/\\P/gi, "\n"),
				raw: f,
				height: u,
				rotation: p,
				width: l || void 0,
				attachment: d >= 1 && d <= 9 ? d : void 0,
				...o ? { extrusion: o } : {}
			};
		}
		case "INSERT":
		case "MINSERT": {
			let [a, o, s] = r.bd3(), c = 1, l = 1, u = 1;
			if (i >= 2e3) {
				let e = r.bb();
				e === 3 || (e === 1 ? (l = r.dd(1), u = r.dd(1)) : e === 2 ? c = l = u = r.rd() : (c = r.rd(), l = r.dd(c), u = r.dd(c)));
			} else c = r.bd(), l = r.bd(), u = r.bd();
			let d = r.bd(), f = q(r.bd3()), p = r.b() === 1, m = 0;
			i >= 2004 && p && (m = r.bl());
			let h, g, _, v;
			t === "MINSERT" && (h = r.bs(), g = r.bs(), _ = r.bd(), v = r.bd());
			let y = e.handle(n.handle), b = [], x;
			if (p) {
				if (i <= 2e3) x = {
					first: e.handle(n.handle),
					last: e.handle(n.handle)
				};
				else for (let t = 0; t < m; t++) b.push(e.handle(n.handle));
				e.hr.h();
			}
			return n.insert = {
				blockHeader: y,
				attribs: b,
				hasAttribs: p,
				chain: x
			}, {
				type: "insert",
				layer: "0",
				color: { kind: "byLayer" },
				blockName: "",
				position: K(a, o, s),
				scale: K(c, l, u),
				rotation: d,
				columnCount: h,
				rowCount: g,
				columnSpacing: _,
				rowSpacing: v,
				...f ? { extrusion: f } : {}
			};
		}
		case "Vertex2d": {
			let e = r.rc(), [t, a, o] = r.bd3(), s = r.bd(), c = 0;
			s < 0 ? (s = -s, c = s) : c = r.bd();
			let l = r.bd(), u = i >= 2010 ? r.bl() : 0, d = r.bd();
			return n.vertex = {
				x: t,
				y: a,
				z: o,
				flags: e,
				bulge: l || void 0,
				startWidth: s || void 0,
				endWidth: c || void 0,
				...u ? { id: u } : {},
				...e & 2 ? { tangent: d } : {}
			}, null;
		}
		case "Vertex3d":
		case "VertexMesh":
		case "VertexPFace": {
			let e = r.rc(), [t, i, a] = r.bd3();
			return n.vertex = {
				x: t,
				y: i,
				z: a,
				flags: e
			}, null;
		}
		case "Polyline2d": {
			let t = r.bs(), a = r.bs();
			r.bd(), r.bd(), i <= 14 ? r.bd() : r.bt();
			let o = r.bd(), s = i <= 14 ? r.bd3() : r.be(), c = i >= 2004 ? r.bl() : 0;
			n.polyline = Sn(e, n, !1, (t & 1) == 1, c), Cn(n.polyline, t, a), o && (n.polyline.elevation = o);
			let l = q(s);
			return l && (n.polyline.extrusion = l), null;
		}
		case "Polyline3d": {
			let t = r.rc(), a = r.rc(), o = i >= 2004 ? r.bl() : 0;
			return n.polyline = Sn(e, n, !0, (a & 1) == 1, o), Cn(n.polyline, a | (t ? 4 : 0), t), null;
		}
		case "BLOCK": return n.blockName = e.text(), null;
		case "ENDBLK":
		case "SEQEND": return null;
		case "LEADER": {
			r.b();
			let t = r.bs(), n = r.bs(), a = r.bl();
			if (a > 1e5) return null;
			let o = [];
			for (let e = 0; e < a; e++) {
				let [e, t, n] = r.bd3();
				o.push(K(e, t, n));
			}
			r.bd3();
			let s = q(r.bd3());
			r.bd3(), r.bd3();
			let c = !0, l = (e, t) => {
				e && r.bd3(), i <= 14 && r.bd(), t && (r.bd(), r.bd()), r.b(), c = r.b() === 1, r.bs(), i <= 14 ? (r.bd(), r.b(), r.b(), r.bs(), r.bs(), r.b(), r.b()) : (r.b(), r.b());
			};
			if (i >= 2010) {
				let t = r.pos;
				l(!0, !1), r.pos !== e.dataEnd && (r.pos = t, l(!1, !0));
			} else l(i > 13, !0);
			let u = e.hr.h();
			return e.hr.h(), {
				type: "leader",
				layer: "0",
				color: { kind: "byLayer" },
				vertices: o,
				hasArrowhead: c ? void 0 : !1,
				pathType: n || void 0,
				annotationType: t === 3 ? void 0 : t,
				annotation: t !== 3 && u.value > 0 ? u.value.toString(16).toUpperCase() : void 0,
				...s ? { extrusion: s } : {}
			};
		}
		case "DimOrdinate":
		case "DimRotated":
		case "DimAligned":
		case "DimAngular3Point":
		case "DimAngular2Line":
		case "DimRadius":
		case "DimDiameter":
		case "ARC_DIMENSION": return En(e, t, n);
		case "3DFACE": {
			let e = {
				type: "face3d",
				layer: "0",
				color: { kind: "byLayer" },
				corners: [
					K(0, 0, 0),
					K(0, 0, 0),
					K(0, 0, 0),
					K(0, 0, 0)
				]
			};
			if (i <= 14) {
				for (let t = 0; t < 4; t++) {
					let [n, i, a] = r.bd3();
					e.corners[t] = K(n, i, a);
				}
				let t = r.bs();
				return t && (e.invisibleEdges = t), e;
			}
			let t = r.b() === 1, n = r.b() === 1, a = r.rd(), o = r.rd(), s = n ? 0 : r.rd();
			e.corners[0] = K(a, o, s);
			let [c, l, u] = [
				a,
				o,
				s
			];
			for (let t = 1; t < 4; t++) c = r.dd(c), l = r.dd(l), u = r.dd(u), e.corners[t] = K(c, l, u);
			if (!t) {
				let t = r.bs();
				t && (e.invisibleEdges = t);
			}
			return e;
		}
		case "SHAPE": {
			let [t, n, i] = r.bd3(), a = r.bd(), o = r.bd(), s = r.bd(), c = r.bd();
			r.bd();
			let l = r.bs(), u = q(r.bd3());
			return e.hr.h(), {
				type: "shape",
				layer: "0",
				color: { kind: "byLayer" },
				position: K(t, n, i),
				size: a,
				rotation: o,
				widthFactor: s === 1 ? void 0 : s,
				oblique: c || void 0,
				styleId: l,
				...u ? { extrusion: u } : {}
			};
		}
		case "TOLERANCE": {
			i <= 14 && (r.bs(), r.bd(), r.bd());
			let [t, n, a] = r.bd3(), [o, s, c] = r.bd3(), l = q(r.bd3()), u = e.text();
			return e.hr.h(), {
				type: "tolerance",
				layer: "0",
				color: { kind: "byLayer" },
				position: K(t, n, a),
				xDirection: K(o, s, c),
				text: u,
				...l ? { extrusion: l } : {}
			};
		}
		case "MLINE": {
			let t = r.bd(), i = r.rc(), [a, o, s] = r.bd3(), c = q(r.bd3()), l = r.bs(), u = r.rc(), d = r.bs();
			if (d > 5e3 || u > 64) return null;
			let f = [];
			for (let e = 0; e < d; e++) {
				let [e, t, n] = r.bd3(), [i, a, o] = r.bd3(), [s, c, l] = r.bd3(), d = [];
				for (let e = 0; e < u; e++) {
					let e = r.bs();
					if (e > 5e3) throw RangeError("mline segparms");
					let t = [];
					for (let n = 0; n < e; n++) t.push(r.bd());
					let n = r.bs();
					if (n > 5e3) throw RangeError("mline areafill");
					let i = [];
					for (let e = 0; e < n; e++) i.push(r.bd());
					d.push({
						segparms: t,
						areaFillParms: i.length ? i : void 0
					});
				}
				f.push({
					position: K(e, t, n),
					direction: K(i, a, o),
					miterDirection: K(s, c, l),
					lines: d
				});
			}
			return n.mlineStyleHandle = e.handle(n.handle), {
				type: "mline",
				layer: "0",
				color: { kind: "byLayer" },
				scale: t,
				justification: i,
				basePoint: K(a, o, s),
				closed: !!(l & 2) || void 0,
				vertices: f,
				...c ? { extrusion: c } : {}
			};
		}
		case "VIEWPORT": {
			let [t, n, a] = r.bd3(), o = r.bd(), s = r.bd(), c = {
				type: "viewport",
				layer: "0",
				color: { kind: "byLayer" },
				center: K(t, n, a),
				width: o,
				height: s
			};
			if (i <= 14) return e.hr.h(), c;
			let [l, u, d] = r.bd3();
			c.viewTarget = K(l, u, d);
			let [f, p, m] = r.bd3();
			c.viewDirection = K(f, p, m), c.twistAngle = r.bd() || void 0, c.viewHeight = r.bd() || void 0, c.lensLength = r.bd() || void 0, r.bd(), r.bd(), e.c.dwgVerByte === 26 ? c.viewCenter = {
				x: r.rd(),
				y: r.rd()
			} : (r.bd(), c.viewCenter = {
				x: r.rd(),
				y: r.rd()
			}, r.rd(), r.rd()), r.rd(), r.rd(), r.rd(), r.rd(), r.bs(), i >= 2007 && r.bs();
			let h = r.bl();
			if (c.statusFlag = r.bl() || void 0, e.text(), r.rc(), r.b(), r.b(), r.bd3(), r.bd3(), r.bd3(), r.bd(), r.bs(), i >= 2004 && r.bs(), i >= 2007 && (r.b(), r.rc(), r.bd(), r.bd(), e.cmc()), h < 1e5) for (let t = 0; t < h; t++) e.hr.h();
			return e.hr.h(), i <= 2002 && e.hr.h(), e.hr.h(), e.hr.h(), i >= 2007 && (e.hr.h(), e.hr.h(), e.hr.h(), e.hr.h()), c;
		}
		case "PolylineMesh": {
			let t = r.bs();
			r.bs();
			let a = r.bs(), o = r.bs();
			r.bs(), r.bs();
			let s = i >= 2004 ? r.bl() : 0;
			return n.mesh = {
				kind: "grid",
				m: a,
				n: o,
				closedM: !!(t & 1),
				closedN: !!(t & 32),
				vertexHandles: []
			}, wn(e, n, s), null;
		}
		case "PolylinePFace": {
			let t = r.bs();
			r.bs();
			let a = i >= 2004 ? r.bl() : 0;
			return n.mesh = {
				kind: "faces",
				m: t,
				vertexHandles: []
			}, wn(e, n, a), null;
		}
		case "PFaceFace": {
			let e = [];
			for (let t = 0; t < 4; t++) e.push(r.bs());
			return n.pfaceFace = e, null;
		}
		case "HATCH": return Dn(e);
		case "POINTCLOUD":
		case "POINTCLOUDEX": {
			r.bs();
			let n = t === "POINTCLOUDEX", i, a, o = 0;
			if (!n) {
				let [t, n, s] = r.bd3();
				if (a = K(t, n, s), i = e.text() || void 0, o = r.bl(), o < 0 || o > 1e5) throw RangeError("scan files");
			}
			let s = {
				type: "pointcloud",
				layer: "0",
				color: { kind: "byLayer" },
				extentsMin: K(0, 0, 0),
				extentsMax: K(0, 0, 0)
			};
			if (a && (s.origin = a), i && (s.fileName = i), n || !o) {
				let [t, i, a] = r.bd3(), [o, c, l] = r.bd3();
				if (s.extentsMin = K(t, i, a), s.extentsMax = K(o, c, l), !n) {
					let t = r.rl();
					s.pointCount = r.rl() * 4294967296 + (t >>> 0), e.text();
				}
				let [u, d, f] = r.bd3();
				s.origin = n ? K(u, d, f) : s.origin ?? K(u, d, f);
				let [p, m, h] = r.bd3(), [g, _, v] = r.bd3(), [y, b, x] = r.bd3();
				s.xAxis = K(p, m, h), s.yAxis = K(g, _, v), s.zAxis = K(y, b, x), n && (s.locked = r.b() === 1, e.hr.h(), e.hr.h(), s.fileName = e.text() || void 0, s.showIntensity = r.b() === 1);
			}
			return s;
		}
		case "OLEFRAME":
		case "OLE2FRAME": {
			let e = r.bs(), t = i >= 2e3 ? r.bs() : void 0, n = r.bl(), a = n > 0 && n < 67108864 ? r.bytes(n) : void 0, o = i >= 2e3 ? r.rc() === 1 : void 0, s = on(a);
			return {
				type: "ole",
				layer: "0",
				color: { kind: "byLayer" },
				oleType: e,
				tileMode: t,
				lockAspect: o || void 0,
				corners: s,
				data: a
			};
		}
		case "ACAD_PROXY_ENTITY": {
			let { classId: n, proxyVersion: r, proxyMaint: a, fromDxf: o, magic: s } = gn(e), c = e.c.classes.get(n), l = c ? hn(c) : void 0;
			if (s) {
				let { dataBits: n, blob: i, strBits: a, strBlob: o } = mn(e), s = pn(e);
				return {
					type: "unknown",
					layer: "0",
					color: { kind: "byLayer" },
					sourceType: c?.dxfName ?? t,
					appClass: l,
					encoding: r & 65535,
					data: n > 0 ? Zt(i) : void 0,
					dataBits: n > 0 ? n : void 0,
					strData: a > 0 ? Zt(o) : void 0,
					strBits: a > 0 ? a : void 0,
					refs: s.refs
				};
			}
			if (c && i >= 2e3 && !o) {
				let t = yn(e, r & 65535);
				if (t) return {
					type: "unknown",
					layer: "0",
					color: { kind: "byLayer" },
					sourceType: c.dxfName,
					appClass: l,
					...t
				};
			}
			return {
				type: "proxy",
				layer: "0",
				color: { kind: "byLayer" },
				sourceType: c?.dxfName ?? t,
				graphics: [],
				appClass: l,
				proxyVersion: r,
				proxyMaint: a,
				fromDxf: o,
				...pn(e),
				...vn(e)
			};
		}
		case "LIGHT": {
			r.bl();
			let t = e.text(), n = r.bl(), i = r.b() === 1, { color: a } = e.cmc();
			r.b();
			let o = r.bd(), [s, c, l] = r.bd3(), [u, d, f] = r.bd3();
			r.bl(), r.b(), r.bd(), r.bd();
			let p = r.bd(), m = r.bd(), h = r.b() === 1;
			return {
				type: "light",
				layer: "0",
				color: { kind: "byLayer" },
				name: t || void 0,
				lightType: n,
				on: i,
				intensity: o,
				position: K(s, c, l),
				target: K(u, d, f),
				lightColor: a,
				hotspotAngle: p || void 0,
				falloffAngle: m || void 0,
				castShadows: h || void 0
			};
		}
		case "MULTILEADER": return On(e, n);
		case "ACAD_TABLE": return Bn(e, n);
		case "PDFUNDERLAY":
		case "DGNUNDERLAY":
		case "DWFUNDERLAY": {
			let i = {
				type: "underlay",
				layer: "0",
				color: { kind: "byLayer" },
				underlayKind: t === "PDFUNDERLAY" ? "pdf" : t === "DGNUNDERLAY" ? "dgn" : "dwf",
				position: {
					x: 0,
					y: 0,
					z: 0
				},
				scale: {
					x: 1,
					y: 1,
					z: 1
				},
				rotation: 0
			};
			r.bd3();
			let [a, o, s] = r.bd3();
			i.position = K(a, o, s), i.rotation = r.bd(), i.scale = K(r.bd(), r.bd(), r.bd()), i.flags = r.rc(), i.contrast = r.rc(), i.fade = r.rc(), n.underlayDefHandle = e.handle(n.handle);
			let c = r.bl();
			if (c > 1e5) throw RangeError("underlay clip");
			let l = [];
			for (let e = 0; e < c; e++) l.push({
				x: r.rd(),
				y: r.rd()
			});
			return l.length && (i.clip = l), i;
		}
		case "MESH": {
			r.bs(), r.b();
			let e = r.bl();
			if (e < 0 || e > 4e6) throw RangeError("mesh subdiv");
			for (let t = 0; t < e; t++) r.bd3();
			let t = r.bl();
			if (t < 0 || t > 4e6) throw RangeError("mesh vertices");
			let n = [];
			for (let e = 0; e < t; e++) {
				let [e, t, i] = r.bd3();
				n.push(K(e, t, i));
			}
			let i = r.bl();
			if (i < 0 || i > 8e6) throw RangeError("mesh faces");
			let a = [];
			for (let e = 0; e < i; e++) a.push(r.bl());
			let o = [];
			for (let e = 0; e < a.length;) {
				let t = a[e++];
				if (t <= 0 || e + t > a.length) break;
				o.push(a.slice(e, e + t).map((e) => e + 1)), e += t;
			}
			let s = r.bl();
			if (s < 0 || s > 4e6) throw RangeError("mesh edges");
			let c = [];
			for (let e = 0; e < s; e++) c.push([r.bl() + 1, r.bl() + 1]);
			let l = r.bl();
			if (l < 0 || l > 4e6) throw RangeError("mesh creases");
			let u = [];
			for (let e = 0; e < l; e++) {
				let t = r.bd(), n = c[e];
				n && t && u.push({
					from: n[0],
					to: n[1],
					weight: t
				});
			}
			let d = {
				type: "mesh",
				layer: "0",
				color: { kind: "byLayer" },
				meshKind: "subd",
				vertices: n
			};
			return o.length && (d.faces = o), e && (d.subdivisionLevel = e), u.length && (d.creases = u), d;
		}
		case "REGION":
		case "3DSOLID":
		case "BODY":
		case "PLANESURFACE":
		case "EXTRUDEDSURFACE":
		case "LOFTEDSURFACE":
		case "REVOLVEDSURFACE":
		case "SWEPTSURFACE":
		case "NURBSURFACE": {
			let e = {
				PLANESURFACE: "plane",
				EXTRUDEDSURFACE: "extruded",
				LOFTEDSURFACE: "lofted",
				REVOLVEDSURFACE: "revolved",
				SWEPTSURFACE: "swept",
				NURBSURFACE: "nurb"
			}[t], n = {
				type: "acis",
				layer: "0",
				color: { kind: "byLayer" },
				kind: e ? "surface" : t === "REGION" ? "region" : t === "3DSOLID" ? "solid3d" : "body"
			};
			if (e && (n.surfaceKind = e), r.b() === 1) return n;
			if (r.b(), r.bs() === 1) {
				let e = "";
				for (;;) {
					let t = r.bl();
					if (t <= 0) break;
					if (t > 33554432) throw RangeError("acis block");
					let n = r.bytes(t);
					for (let t of n) e += String.fromCharCode(t <= 32 ? t : 159 - t);
				}
				return n.sat = e, n;
			}
			let i = Math.min(r.data.length, r.endBit + 7 >> 3), a = (e) => {
				let t = e >> 3, n = e & 7, a = Math.max(0, i - t), o = new Uint8Array(a);
				for (let e = 0; e < a; e++) o[e] = n === 0 ? r.data[t + e] : (r.data[t + e] << n | (r.data[t + e + 1] ?? 0) >> 8 - n) & 255;
				return o;
			}, o = (e, t) => {
				for (let n = 0; n < t.length; n++) if (e[n] !== t.charCodeAt(n)) return !1;
				return !0;
			}, s = null, c = r.pos;
			for (let e = 0; e <= 64 && !s; e++) {
				let t = a(r.pos + e);
				(o(t, "ACIS BinaryFile") || o(t, "ASM BinaryFile")) && (s = t, c = r.pos + e);
			}
			s ||= (r.align(), c = r.pos, r.data.subarray(r.pos >> 3, i));
			let l = "";
			for (let e = 0; e < s.length; e++) l += String.fromCharCode(s[e]);
			let u = l.indexOf("EndofACIS\rdata"), d = 21;
			u === -1 && (u = l.indexOf("EndofASM\rdata"), d = 20);
			let f = u === -1 ? s.length : u + d, p = "", m = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
			for (let e = 0; e < f; e += 3) {
				let t = s[e], n = s[e + 1], r = s[e + 2];
				p += m[t >> 2] + m[(t & 3) << 4 | (n ?? 0) >> 4] + (e + 1 < f ? m[((n ?? 0) & 15) << 2 | (r ?? 0) >> 6] : "=") + (e + 2 < f ? m[(r ?? 0) & 63] : "=");
			}
			return n.sab = p, r.pos = c + f * 8, n;
		}
		case "IMAGE":
		case "WIPEOUT": {
			if (r.bl() > 10) throw RangeError("image class version");
			let [a, o, s] = r.bd3(), [c, l, u] = r.bd3(), [d, f, p] = r.bd3(), m = r.rd(), h = r.rd();
			n.imageDefHandle = e.handle(n.handle), r.bs();
			let g = r.b() === 1, _ = r.rc(), v = r.rc(), y = r.rc();
			e.hr.h();
			let b = i >= 2010 && r.b() === 1, x = r.bs(), S, C = x === 1 ? 2 : r.bl();
			if (C <= 1e4) {
				S = [];
				for (let e = 0; e < C; e++) S.push({
					x: r.rd(),
					y: r.rd()
				});
			}
			return {
				type: "image",
				layer: "0",
				color: { kind: "byLayer" },
				wipeout: t === "WIPEOUT" || void 0,
				position: K(a, o, s),
				uVector: K(c, l, u),
				vVector: K(d, f, p),
				widthPx: m,
				heightPx: h,
				clip: g ? S : void 0,
				clipInverted: b || void 0,
				brightness: _ === 50 ? void 0 : _,
				contrast: v === 50 ? void 0 : v,
				fade: y || void 0
			};
		}
		default: return {
			type: "unknown",
			layer: "0",
			color: { kind: "byLayer" },
			sourceType: t
		};
	}
}, Sn = (e, t, n, r, i) => {
	let a = {
		is3d: n,
		closed: r,
		vertexHandles: []
	};
	if (e.v <= 2e3) a.first = e.handle(t.handle), a.last = e.handle(t.handle);
	else for (let n = 0; n < i; n++) a.vertexHandles.push(e.handle(t.handle));
	return e.hr.h(), a;
}, Cn = (e, t, n) => {
	t & 2 && (e.curveFit = !0), t & 4 && (e.splineFit = !0), t & 128 && (e.plineGen = !0), n && (e.curveType = n);
}, wn = (e, t, n) => {
	if (e.v <= 2e3) e.hr.h(), e.hr.h();
	else if (n < 1e5) for (let r = 0; r < n; r++) t.mesh.vertexHandles.push(e.handle(t.handle));
	e.hr.h();
}, Tn = {
	DimRotated: ["linear", 0],
	DimAligned: ["aligned", 1],
	DimAngular2Line: ["angular2ln", 2],
	DimDiameter: ["diameter", 3],
	DimRadius: ["radius", 4],
	DimAngular3Point: ["angular3pt", 5],
	DimOrdinate: ["ordinate", 6],
	ARC_DIMENSION: ["arc", 0]
}, En = (e, t, n) => {
	let { r, v: i } = e, [a, o] = Tn[t];
	i >= 2010 && r.rc();
	let s = q(r.bd3()), c = r.rd(), l = r.rd(), u = r.bd(), d = r.rc(), f = e.text(), p = r.bd(), m = r.bd();
	r.bd3(), r.bd();
	let h, g, _, v;
	i >= 2e3 && (h = r.bs(), g = r.bs(), _ = r.bd(), v = r.bd()), i >= 2007 && (r.b(), r.b(), r.b());
	let y = r.rd(), b = r.rd(), x = {
		type: "dimension",
		layer: "0",
		color: { kind: "byLayer" },
		kind: a,
		dimensionType: o | 32 | (d & 1 ? 0 : 128),
		definitionPoint: K(0, 0, 0),
		textMidpoint: K(c, l, u),
		elevation: u || void 0,
		text: f || void 0,
		textRotation: p || void 0,
		horizDirection: m || void 0,
		attachment: h,
		lineSpacingStyle: g,
		lineSpacingFactor: _,
		measurement: v,
		...s ? { extrusion: s } : {}
	};
	(y || b) && (x.insertionPoint = K(y, b, 0));
	let S = () => {
		let [e, t, n] = r.bd3();
		return K(e, t, n);
	};
	switch (t) {
		case "DimOrdinate":
			x.definitionPoint = S(), x.point13 = S(), x.point14 = S(), r.rc() & 1 && (x.dimensionType |= 64);
			break;
		case "DimRotated":
			x.point13 = S(), x.point14 = S(), x.definitionPoint = S(), x.obliqueAngle = r.bd() || void 0, x.rotation = r.bd() || void 0;
			break;
		case "DimAligned":
			x.point13 = S(), x.point14 = S(), x.definitionPoint = S(), x.obliqueAngle = r.bd() || void 0;
			break;
		case "DimAngular3Point":
			x.definitionPoint = S(), x.point13 = S(), x.point14 = S(), x.point15 = S();
			break;
		case "DimAngular2Line":
			x.point16 = K(r.rd(), r.rd(), 0), x.point13 = S(), x.point14 = S(), x.point15 = S(), x.definitionPoint = S();
			break;
		case "DimRadius":
			x.definitionPoint = S(), x.point15 = S(), x.leaderLength = r.bd() || void 0;
			break;
		case "DimDiameter":
			x.point15 = S(), x.definitionPoint = S(), x.leaderLength = r.bd() || void 0;
			break;
		case "ARC_DIMENSION": x.definitionPoint = S(), x.point13 = S(), x.point14 = S(), x.point15 = S(), r.b(), r.bd(), r.bd(), r.b(), x.point16 = S(), S();
	}
	return n.dimStyleHandle = e.handle(n.handle), n.dimBlock = e.handle(n.handle), x;
}, Dn = (e) => {
	let { r: t, v: n } = e, r;
	if (n >= 2004) {
		let n = t.bl();
		t.bl();
		let i = t.bd(), a = t.bd(), o = t.bl(), s = t.bd(), c = t.bl();
		if (n && c > 1e3) throw RangeError("hatch colors");
		let l = [];
		for (let n = 0; n < c && n <= 1e3; n++) {
			let n = t.bd(), { color: r } = e.cmc();
			l.push({
				shift: n,
				color: r
			});
		}
		let u = e.text();
		n && (r = {
			name: u,
			angle: i,
			shift: a,
			tint: s,
			singleColor: o !== 0,
			colors: l
		});
	}
	let i = t.bd(), a = q(t.bd3()), o = e.text(), s = t.b() === 1, c = t.b() === 1, l = t.bl();
	if (l > 1e4) throw RangeError("hatch paths");
	let u = [], d = !1, f = [];
	for (let e = 0; e < l; e++) {
		let e = t.bl();
		e & 4 && (d = !0);
		let r = {};
		if (e & 1 && (r.external = !0), e & 4 && (r.derived = !0), e & 16 && (r.outermost = !0), e & 2) {
			let e = t.b() === 1, n = t.b() === 1, i = t.bl();
			if (i > 1e4) throw RangeError("hatch verts");
			let a = [];
			for (let n = 0; n < i; n++) {
				let n = {
					x: t.rd(),
					y: t.rd()
				};
				if (e) {
					let e = t.bd();
					e && (n.bulge = e);
				}
				a.push(n);
			}
			u.push({
				kind: "polyline",
				vertices: a,
				closed: n,
				...r
			});
		} else {
			let e = t.bl();
			if (e > 1e4) throw RangeError("hatch segs");
			let i = [];
			for (let r = 0; r < e; r++) {
				let e = t.rc();
				if (e === 1) i.push({
					kind: "line",
					start: {
						x: t.rd(),
						y: t.rd()
					},
					end: {
						x: t.rd(),
						y: t.rd()
					}
				});
				else if (e === 2) i.push({
					kind: "arc",
					center: {
						x: t.rd(),
						y: t.rd()
					},
					radius: t.bd(),
					startAngle: t.bd(),
					endAngle: t.bd(),
					ccw: t.b() === 1
				});
				else if (e === 3) i.push({
					kind: "ellipticalArc",
					center: {
						x: t.rd(),
						y: t.rd()
					},
					majorAxis: {
						x: t.rd(),
						y: t.rd()
					},
					ratio: t.bd(),
					startAngle: t.bd(),
					endAngle: t.bd(),
					ccw: t.b() === 1
				});
				else if (e === 4) {
					let e = t.bl(), r = t.b() === 1, a = t.b() === 1, o = t.bl(), s = t.bl();
					if (o > 1e4 || s > 1e4) throw RangeError("hatch spline");
					let c = [];
					for (let e = 0; e < o; e++) c.push(t.bd());
					let l = [], u = [];
					for (let e = 0; e < s; e++) l.push({
						x: t.rd(),
						y: t.rd()
					}), r && u.push(t.bd());
					let d;
					if (n >= 2010) {
						let e = t.bl();
						if (e > 1e4) throw RangeError("hatch spline fit");
						if (e > 0) {
							d = [];
							for (let n = 0; n < e; n++) d.push({
								x: t.rd(),
								y: t.rd()
							});
							t.rd(), t.rd(), t.rd(), t.rd();
						}
					}
					i.push({
						kind: "spline",
						degree: e,
						periodic: a || void 0,
						knots: c,
						controlPoints: l,
						weights: r ? u : void 0,
						fitPoints: d
					});
				} else throw RangeError("hatch curve type");
			}
			u.push(Object.assign(Vn(i), r));
		}
		let i = t.bl();
		if (i > 1e4) throw RangeError("hatch boundary handles");
		f.push(i);
	}
	for (let t = 0; t < u.length; t++) {
		let n = f[t] ?? 0;
		if (!n) continue;
		let r = [];
		for (let t = 0; t < n; t++) {
			let t = e.hr.h();
			t.value && r.push(t.value.toString(16).toUpperCase());
		}
		r.length && (u[t].boundaryHandles = r);
	}
	let p = t.bs(), m = t.bs(), h = 0, g = 1, _ = !1, v;
	if (!s) {
		h = t.bd(), g = t.bd(), _ = t.b() === 1;
		let e = t.bs();
		if (e > 1e3) throw RangeError("hatch deflines");
		v = [];
		for (let n = 0; n < e; n++) {
			let e = t.bd(), n = {
				x: t.bd(),
				y: t.bd()
			}, r = {
				x: t.bd(),
				y: t.bd()
			}, i = t.bs();
			if (i > 1e3) throw RangeError("hatch dashes");
			let a = [];
			for (let e = 0; e < i; e++) a.push(t.bd());
			v.push({
				angle: 180 / Math.PI * e,
				base: n,
				offset: r,
				dashes: a
			});
		}
	}
	let y = d ? t.bd() : void 0, b = t.bl(), x;
	if (b > 0 && b <= 1e4) {
		x = [];
		for (let e = 0; e < b; e++) x.push({
			x: t.rd(),
			y: t.rd()
		});
	}
	return {
		type: "hatch",
		layer: "0",
		color: { kind: "byLayer" },
		patternName: o || (s ? "SOLID" : "ANSI31"),
		solid: s,
		angle: 180 / Math.PI * h,
		scale: g > 0 ? g : 1,
		loops: u,
		elevation: i || void 0,
		associative: c || void 0,
		...a ? { extrusion: a } : {},
		styleFlag: p || void 0,
		patternType: m,
		doubled: _ || void 0,
		definitionLines: v?.length ? v : void 0,
		gradient: r,
		seeds: x,
		pixelSize: y
	};
}, On = (e, t) => {
	let { r: n, v: r } = e, i = {
		type: "mleader",
		layer: "0",
		color: { kind: "byLayer" },
		leaders: []
	};
	r >= 2010 && n.bs();
	let a = n.bl();
	if (a > 1e4) throw RangeError("mleader leaders");
	for (let t = 0; t < a; t++) {
		let t = { lines: [] }, a = n.b() === 1, o = n.b() === 1;
		if (a) {
			let [e, r, i] = n.bd3();
			t.landing = K(e, r, i);
		}
		if (o) {
			let [e, r, i] = n.bd3();
			t.doglegVector = K(e, r, i);
		}
		let s = n.bl();
		if (s > 1e4) throw RangeError("mleader breaks");
		for (let e = 0; e < s; e++) n.bd3(), n.bd3();
		n.bl(), t.doglegLength = n.bd() || void 0;
		let c = n.bl();
		if (c > 1e4) throw RangeError("mleader lines");
		for (let i = 0; i < c; i++) {
			let i = n.bl();
			if (i > 1e5) throw RangeError("mleader points");
			let a = [];
			for (let e = 0; e < i; e++) {
				let [e, t, r] = n.bd3();
				a.push(K(e, t, r));
			}
			let o = n.bl();
			if (o > 1e4) throw RangeError("mleader line breaks");
			for (let e = 0; e < o; e++) n.bd3(), n.bd3();
			n.bl(), r >= 2010 && (n.bs(), e.cmc(), e.hr.h(), n.bl(), n.bd(), e.hr.h(), n.bl()), a.length && t.lines.push(a);
		}
		r >= 2010 && n.bs(), i.leaders.push(t);
	}
	i.scale = n.bd() || void 0, n.bd3();
	let o = n.bd();
	if (i.arrowSize = n.bd() || void 0, n.bd(), n.bs(), n.bs(), n.bs(), n.bs(), n.b() === 1) {
		i.text = e.text() || void 0, n.bd3(), e.hr.h();
		let [t, r, a] = n.bd3();
		i.textPosition = K(t, r, a), n.bd3(), i.textRotation = n.bd() || void 0, n.bd(), n.bd(), n.bd(), n.bs(), e.cmc(), n.bs(), n.bs(), e.cmc(), n.bd(), n.bl(), n.b(), n.b(), n.bs(), n.b(), n.bd(), n.bd(), n.b();
		let s = n.bl();
		if (s > 1e4) throw RangeError("mleader columns");
		for (let e = 0; e < s; e++) n.bd();
		n.b(), n.b(), i.textHeight = o || void 0;
	} else if (n.b() === 1) {
		t.mleaderBlock = e.handle(t.handle), n.bd3();
		let [r, a, o] = n.bd3();
		i.blockPosition = K(r, a, o);
		let [s, c, l] = n.bd3();
		i.blockScale = K(s, c, l), i.blockRotation = n.bd() || void 0, e.cmc();
		for (let e = 0; e < 16; e++) n.bd();
	}
	n.bd3(), n.bd3(), n.bd3(), n.b(), r >= 2010 && (n.bs(), n.bs()), t.mleaderStyle = e.handle(t.handle), n.bl(), n.bs(), e.cmc(), e.hr.h(), n.bl(), i.hasLanding = n.b() === 1 || void 0, i.hasDogleg = n.b() === 1 || void 0, n.bd(), e.hr.h();
	let s = n.bd();
	s && (i.arrowSize = s);
	try {
		if (n.bs(), e.hr.h(), n.bs(), n.bs(), n.bs(), n.bs(), e.cmc(), n.b(), e.hr.h(), e.cmc(), n.bd3(), n.bd(), n.bs(), n.b(), r < 2010) {
			let t = n.bl();
			if (t > 1e4) throw RangeError("mleader arrowheads");
			for (let r = 0; r < t; r++) n.b(), e.hr.h();
		}
		let a = n.bl();
		if (a > 1e4) throw RangeError("mleader labels");
		let o = [];
		for (let r = 0; r < a; r++) {
			let r = e.handle(t.handle), i = e.text(), a = n.bs(), s = n.bd(), c = {
				index: a,
				text: i
			};
			r && (c.attdef = r.toString(16).toUpperCase()), s && (c.width = s), o.push(c);
		}
		o.length && (i.attributes = o);
	} catch {}
	return i;
}, kn = (e) => {
	let { r: t, v: n } = e;
	if (n < 2007) return e.text();
	let r = t.bs();
	if (r <= 0 || r > 1048576) return "";
	let i = t.bytes(r), a = "";
	for (let e = 0; e + 1 < i.length; e += 2) {
		let t = i[e] | i[e + 1] << 8;
		if (!t) break;
		a += String.fromCharCode(t);
	}
	return we(a);
}, An = (e) => {
	if (e.length < 2 || e.length & 1) return;
	let t = "";
	for (let n = 0; n + 1 < e.length; n += 2) {
		let r = e[n] | e[n + 1] << 8;
		if (!r) {
			for (let t = n; t < e.length; t++) if (e[t]) return;
			break;
		}
		if (r < 32 && r !== 9 && r !== 10 && r !== 13) return;
		t += String.fromCharCode(r);
	}
	return we(t);
}, jn = (e, t = !1) => {
	let { r: n, v: r } = e, i, a = 0;
	r >= 2007 && (a = n.bl());
	let o = n.bl();
	if (!(r >= 2007 && a & 1)) switch (o) {
		case 0:
		case 1:
			n.bl();
			break;
		case 2:
			n.bd();
			break;
		case 4:
			i = kn(e);
			break;
		case 8: {
			let e = n.bl();
			if (e < 0 || e > 16777216) throw RangeError("table date");
			n.bytes(e);
			break;
		}
		case 16:
			n.bl(), n.rd(), n.rd();
			break;
		case 32:
			n.bl(), n.rd(), n.rd(), n.rd();
			break;
		case 64:
			e.hr.h();
			break;
		case 128:
		case 256: break;
		case 512: {
			if (r < 2007) break;
			let e = n.bl();
			if (e < 0 || e > 16777216) throw RangeError("table blob");
			i = An(n.bytes(e));
			break;
		}
		default: throw RangeError("table value type " + o);
	}
	if (r >= 2007) {
		let r = n.bl();
		if (e.text(), t || r !== 12) {
			let t = e.text();
			!i && t && (i = t);
		}
	}
	return i || void 0;
}, Mn = (e) => {
	let { r: t } = e;
	switch (t.bl(), t.bl(), t.bl(), t.bs() << 16 >> 16) {
		case 40:
			t.bd();
			break;
		case 10:
		case 11:
			t.rd(), t.rd();
			break;
		case 1:
			e.text();
			break;
		case 90:
			t.bl();
			break;
		case 91:
			e.hr.h();
			break;
		case 70: t.bs();
	}
	t.bl();
}, Nn = (e) => {
	let { r: t } = e, n = t.bl();
	if (n < 0 || n > 1e5) throw RangeError("block prop info");
	for (let r = 0; r < n; r++) t.bl(), e.text();
}, Pn = (e) => {
	let { r: t } = e, n = t.pos;
	t.bs();
	let r = t.bl() >>> 24 & 255;
	t.pos = n;
	let i = e.cmc(!0).color;
	return r === 200 ? void 0 : i;
}, Fn = (e) => {
	let { r: t } = e, n = t.bl();
	t.bl(), t.bl(), t.bl(), e.text();
	let r = t.bd();
	return t.bd(), {
		override: n,
		rotation: r,
		alignment: t.bl(),
		color: Pn(e),
		textStyle: e.handle(0),
		textHeight: t.bd()
	};
}, In = (e) => {
	let { r: t } = e;
	if (t.bl(), !t.bs()) return;
	let n = t.bl();
	t.bl();
	let r = Pn(e);
	t.bl();
	let i = Fn(e), a;
	if (t.bs()) {
		a = [];
		for (let e = 0; e < 6; e++) a.push(t.bd());
	}
	let o = t.bl();
	if (o > 6) throw RangeError("table cell borders");
	let s = [];
	for (let n = 0; n < o; n++) {
		let n = t.bl();
		if (!n) continue;
		let r = t.bl();
		t.bl();
		let i = Pn(e), a = t.bl();
		e.hr.h();
		let o = t.bl() !== 0;
		t.bd(), s.push({
			mask: n,
			override: r,
			color: i,
			lineweight: a,
			invisible: o
		});
	}
	return {
		propOverride: n,
		background: r,
		format: i,
		margins: a,
		borders: s
	};
}, Ln = (e, t, n) => {
	let r = t.format;
	t.propOverride & 16 && (e.alignment = r.alignment), t.propOverride & 512 && t.background && (e.fillColor = t.background), n && (n.override & 4 && n.rotation && (e.rotation = n.rotation), n.override & 32 && n.color && (e.textColor = n.color), n.override & 128 && n.textHeight > 0 && (e.textHeight = n.textHeight));
	for (let n of t.borders) {
		if (!n.override) continue;
		let t = {};
		if (n.override & 8 && n.color && (t.color = n.color), n.override & 2 && (t.lineweight = n.lineweight), n.override & 16 && (t.visible = !n.invisible), !Object.keys(t).length) continue;
		let r = n.mask === 1 ? "top" : n.mask === 2 ? "right" : n.mask === 4 ? "bottom" : n.mask === 8 ? "left" : void 0;
		r && ((e.borders ??= {})[r] = t);
	}
	if (n && n.override & 64) return n.textStyle || r.textStyle || void 0;
}, Rn = (e) => {
	let { r: t } = e, n = t.bl();
	if (n > 1e4) throw RangeError("table custom data");
	for (let t = 0; t < n; t++) e.text(), jn(e);
}, zn = (e, t = !1) => {
	let { r: n } = e;
	e.text(), e.text();
	let r = n.bl();
	if (r > 1e4) throw RangeError("table columns");
	let i = [];
	for (let t = 0; t < r; t++) e.text(), n.bl(), Rn(e), In(e), n.bl(), i.push(n.bd());
	let a = n.bl();
	if (a > 1e5) throw RangeError("table rows");
	if (a * r > 2e5) throw RangeError("table size");
	let o = [], s = [], c = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Map(), u = [];
	for (let t = 0; t < a; t++) {
		let i = n.bl();
		if (i > 1e4) throw RangeError("table row cells");
		for (let a = 0; a < i; a++) {
			let i = {}, o = t * r + a;
			n.bl(), e.text(), n.bl(), Rn(e), n.bl() && (e.hr.h(), n.bl(), n.bl(), n.bl());
			let u = n.bl();
			if (u > 1e4) throw RangeError("table cell contents");
			let d;
			for (let t = 0; t < u; t++) {
				let t = n.bl(), r;
				if (t === 1) {
					let t = jn(e);
					t && !i.text && (i.text = t), i.contentType = 1;
				} else (t === 2 || t === 4) && (r = -1, i.contentType = t === 4 ? 2 : 1);
				let a = n.bl();
				if (a > 1e4) throw RangeError("table cell attributes");
				let s = [];
				for (let t = 0; t < a; t++) {
					let t = e.text(), r = n.bl();
					s.push({
						index: r,
						text: t
					});
				}
				if (n.bs()) {
					let t = Fn(e);
					d = d ? {
						...t,
						override: d.override | t.override
					} : t;
				}
				if (r !== void 0) {
					let n = e.handle(0);
					t === 4 && n && c.set(o, n);
				}
				for (let t of s) {
					let n = e.handle(0);
					n && (t.attdef = n.toString(16).toUpperCase());
				}
				s.length && (i.attributes = s);
			}
			let f = In(e);
			if (f) {
				let e = Ln(i, f, d);
				e && l.set(o, e);
			}
			if (n.bl(), n.bl()) {
				n.bl(), n.bd(), n.bd();
				let t = n.bl();
				if (t > 1e4) throw RangeError("table cell geometry");
				e.hr.h();
				for (let e = 0; e < t; e++) n.bd3(), n.bd3(), n.bd(), n.bd(), n.bd(), n.bd(), n.bl();
			}
			s.push(i);
		}
		for (let e = i; e < r; e++) s.push({});
		n.bl(), Rn(e), In(e), u.push(n.bl()), o.push(n.bd());
	}
	let d;
	try {
		let i = n.bl();
		if (i > 1e5) throw RangeError("table field refs");
		for (let t = 0; t < i; t++) e.hr.h();
		In(e);
		let a = n.bl();
		if (a > 1e5) throw RangeError("table merges");
		for (let e = 0; e < a; e++) {
			let e = n.bl(), t = n.bl(), i = n.bl(), a = n.bl(), o = s[e * r + t];
			if (o) {
				a > t && (o.spanColumns = a - t + 1), i > e && (o.spanRows = i - e + 1);
				for (let n = e; n <= i; n++) for (let e = t; e <= a; e++) {
					let t = s[n * r + e];
					t && t !== o && (t.merged = !0);
				}
			}
		}
		if (t) {
			n.bl();
			let [e, t, r] = n.bd3();
			isFinite(e) && isFinite(t) && isFinite(r) && (e || t || r) && (d = K(e, t, r));
		}
	} catch {}
	let f = {
		numRows: a,
		numColumns: r,
		rowHeights: o,
		columnWidths: i,
		cells: s
	};
	return d && (f.direction = d), u.length && !u.includes(1) && (f.titleSuppressed = !0), u.length > 1 && !u.includes(2) && (f.headerSuppressed = !0), c.size && (f.cellBlocks = c), l.size && (f.cellTextStyles = l), f;
}, Bn = (e, t) => {
	let { r: n, v: r } = e;
	if (r >= 2010) {
		let [i, a, o] = n.bd3(), s = n.pos, c = e.hr.pos, l = e.sr?.pos;
		try {
			let s = n.bb();
			if (s === 1) n.dd(1), n.dd(1);
			else if (s === 2) n.rd();
			else if (s !== 3) {
				let e = n.rd();
				n.dd(e), n.dd(e);
			}
			n.bd();
			let c = q(n.bd3()), l = n.b() === 1, u = 0;
			if (l && (u = n.bl()), n.rc(), n.bl(), r >= 2013 ? n.bl() : n.b(), t.tableBlock = e.handle(t.handle), l) {
				for (let t = 0; t < u && t < 1e5; t++) e.hr.h();
				e.hr.h();
			}
			let d = zn(e, !0);
			if (d.numRows <= 0 || d.numColumns <= 0 || n.pos > e.dataEnd) throw RangeError("table inline grid");
			for (d.cellBlocks && (t.tableCellBlocks = d.cellBlocks), d.cellTextStyles && (t.tableCellTextStyles = d.cellTextStyles); e.hr.pos + 8 <= e.hr.endBit;) {
				let n = e.hr.h();
				n.code === 5 && n.value && (t.tableStyle = n.value);
			}
			return {
				type: "table",
				layer: "0",
				color: { kind: "byLayer" },
				position: K(i, a, o),
				direction: d.direction ?? K(1, 0, 0),
				numRows: d.numRows,
				numColumns: d.numColumns,
				rowHeights: d.rowHeights,
				columnWidths: d.columnWidths,
				cells: d.cells,
				...d.titleSuppressed ? { titleSuppressed: !0 } : {},
				...d.headerSuppressed ? { headerSuppressed: !0 } : {},
				...c ? { extrusion: c } : {}
			};
		} catch {
			n.pos = s, e.hr.pos = c, e.sr && l !== void 0 && (e.sr.pos = l);
		}
		return {
			type: "table",
			layer: "0",
			color: { kind: "byLayer" },
			position: K(i, a, o),
			direction: K(1, 0, 0),
			numRows: 0,
			numColumns: 0,
			rowHeights: [],
			columnWidths: [],
			cells: []
		};
	}
	let [i, a, o] = n.bd3();
	if (r >= 2e3) {
		let e = n.bb();
		if (e !== 3) {
			if (e === 1) n.dd(1), n.dd(1);
			else if (e === 2) n.rd();
			else {
				let e = n.rd();
				n.dd(e), n.dd(e);
			}
		}
	} else n.bd(), n.bd(), n.bd();
	n.bd();
	let s = q(n.bd3()), c = n.b() === 1, l = 0;
	if (r >= 2004 && c && (l = n.bl()), t.tableBlock = e.handle(t.handle), c) {
		if (r <= 2e3) e.hr.h(), e.hr.h();
		else for (let t = 0; t < l && t < 1e5; t++) e.hr.h();
		e.hr.h();
	}
	t.tableStyle = e.handle(t.handle), n.bs();
	let [u, d, f] = n.bd3(), p = n.bl(), m = n.bl();
	if (p > 1e4 || m > 1e5) throw RangeError("table size");
	let h = [];
	for (let e = 0; e < p; e++) h.push(n.bd());
	let g = [];
	for (let e = 0; e < m; e++) g.push(n.bd());
	let _ = [], v = p * m;
	if (v > 2e5) throw RangeError("table cells");
	let y = /* @__PURE__ */ new Map(), b = /* @__PURE__ */ new Map(), x = (i, a) => {
		let o = {}, s = n.bs();
		if (s !== 1 && s !== 2) throw RangeError("table cell type");
		o.contentType = s, n.rc(), n.b() && (o.merged = !0), n.b() && (o.autofit = !0);
		let c = n.bl(), l = n.bl();
		c > 1 && (o.spanColumns = c), l > 1 && (o.spanRows = l);
		let u = n.bd();
		if (u && (o.rotation = u), s === 1) e.hr.h(), (r < 2007 || a) && (o.text = e.text() || void 0);
		else if (y.set(i, e.handle(t.handle)), n.bd(), n.b()) {
			let r = n.bs();
			if (r > 1e4) throw RangeError("table attrs");
			let i = [];
			for (let a = 0; a < r; a++) {
				let r = e.handle(t.handle), a = n.bs(), o = e.text();
				i.push({
					attdef: r.toString(16).toUpperCase(),
					index: a,
					text: o
				});
			}
			i.length && (o.attributes = i);
		}
		if (n.b()) {
			let r = n.bl();
			if (n.rc(), r & 1 && (o.alignment = n.bs()), r & 2 && (o.fillEnabled = n.b() === 0), r & 4 && (o.fillColor = e.cmc(!0).color), r & 8 && (o.textColor = e.cmc(!0).color), r & 16) {
				let n = e.handle(t.handle);
				n && b.set(i, n);
			}
			r & 32 && (o.textHeight = n.bd()), [
				"top",
				"right",
				"bottom",
				"left"
			].forEach((t, i) => {
				let a = 64 << i, s = 1024 << i, c = 16384 << i;
				if (!(r & (a | s | c))) return;
				let l = {};
				r & a && (l.color = e.cmc(!0).color), r & s && (l.lineweight = n.bs()), r & c && (l.visible = n.bs() === 0), (o.borders ??= {})[t] = l;
			});
		}
		if (r >= 2007 && !a) {
			n.bl();
			let t = jn(e, !0);
			t && (o.text = t);
		}
		return o;
	}, S = {}, C = () => {
		if (n.b()) {
			let t = n.bl();
			t & 1 && n.b() && (S.titleSuppressed = !0), t & 2 && (S.headerSuppressed = !0), t & 4 && (S.flowDirection = n.bs()), t & 8 && (S.horizontalMargin = n.bd()), t & 16 && (S.verticalMargin = n.bd());
			for (let n of [
				32,
				64,
				128
			]) t & n && e.cmc(!0);
			for (let e of [
				256,
				512,
				1024
			]) t & e && n.b();
			for (let n of [
				2048,
				4096,
				8192
			]) t & n && e.cmc(!0);
			for (let e of [
				16384,
				32768,
				65536
			]) t & e && n.bs();
			for (let n of [
				131072,
				262144,
				524288
			]) t & n && e.hr.h();
			for (let e of [
				1048576,
				2097152,
				4194304
			]) t & e && n.bd();
		}
		if (n.b()) {
			let t = n.bl();
			for (let n = 1; n <= 32768; n <<= 1) t & n && e.cmc(!0);
		}
		if (n.b()) {
			let e = n.bl();
			for (let t = 1; t <= 32768; t <<= 1) e & t && n.bs();
		}
		if (n.b()) {
			let e = n.bl();
			for (let t = 1; t <= 32768; t <<= 1) e & t && n.bs();
		}
	}, w = (t) => {
		_.length = 0, y.clear();
		for (let e = 0; e < v; e++) _.push(x(e, t));
		if (n.pos > e.dataEnd) throw RangeError("table cells overrun");
		if (n.pos === e.dataEnd) return;
		let r = n.pos, i = e.hr.pos;
		try {
			C();
		} catch {
			n.pos = r, e.hr.pos = i;
		}
	};
	if (r === 2007) {
		let t = n.pos, r = e.hr.pos, i = e.sr?.pos;
		try {
			w(!1);
		} catch {
			n.pos = t, e.hr.pos = r, e.sr && i !== void 0 && (e.sr.pos = i), w(!0);
		}
	} else w(!1);
	return y.size && (t.tableCellBlocks = y), b.size && (t.tableCellTextStyles = b), {
		type: "table",
		layer: "0",
		color: { kind: "byLayer" },
		position: K(i, a, o),
		direction: isFinite(u) && isFinite(d) && isFinite(f) ? K(u, d, f) : K(1, 0, 0),
		numRows: m,
		numColumns: p,
		rowHeights: g,
		columnWidths: h,
		cells: _,
		...S,
		...s ? { extrusion: s } : {}
	};
}, Vn = (e) => {
	if (e.length === 1) {
		let t = e[0], n = Math.PI * 2, r = (e, t) => Math.abs(Math.abs(t - e) - n) < 1e-9 || e === t;
		if (t.kind === "arc" && r(t.startAngle, t.endAngle)) return {
			kind: "circle",
			center: t.center,
			radius: t.radius
		};
		if (t.kind === "ellipticalArc" && r(t.startAngle, t.endAngle)) return {
			kind: "ellipse",
			center: t.center,
			majorAxis: t.majorAxis,
			ratio: t.ratio
		};
	}
	return {
		kind: "edges",
		edges: e
	};
}, Hn = (e, t) => {
	if (e.r.pos > e.dataEnd || e.dataEnd - e.r.pos >= 8) throw RangeError(`${t}: ${e.r.pos} of ${e.dataEnd} data bits`);
}, Un = (e, t) => {
	let { r: n, v: r } = e, i = e.text().replace(/\0+$/, ""), a = n.bs(), o = n.bs(), s = n.bd(), c = n.bd(), l = n.b() === 1, u = n.b() === 1, d = () => {
		let i = e.hr.hAbs(t), a = n.bd(), o = n.bs(), s = e.cmc(!0).color, c = e.cmc(!0).color, l = n.b() === 1, u = [];
		for (let t = 0; t < 6; t++) {
			let t = n.bs(), r = n.b() === 1, i = e.cmc(!0).color;
			u.push({
				lineweight: t,
				visible: r,
				color: i
			});
		}
		let d = {
			textStyleHandle: i,
			textHeight: a,
			alignment: o,
			textColor: s,
			fillColor: c,
			fillOn: l,
			borders: u
		};
		return r >= 2007 && (d.dataType = n.bl(), d.unitType = n.bl(), d.format = e.text() || void 0), d;
	}, f = d(), p = d(), m = d();
	return Hn(e, "TABLESTYLE"), {
		description: i || void 0,
		flowDirection: a,
		flags: o,
		horizontalMargin: s,
		verticalMargin: c,
		titleSuppressed: l,
		headerSuppressed: u,
		data: f,
		title: p,
		header: m
	};
}, Wn = (e, t) => {
	let { r: n } = e;
	n.bl();
	let r = n.bs(), i = n.bl();
	r && n.bl();
	let a = e.cmc(!0);
	n.bl(), n.bl(), n.bl();
	let o = n.bl(), s = n.bl(), c = e.text();
	n.bd(), n.bd();
	let l = n.bl(), u = e.cmc(!0).color, d = e.hr.hAbs(t), f = n.bd(), p;
	if (n.bs()) {
		p = [];
		for (let e = 0; e < 6; e++) p.push(n.bd());
	}
	let m = n.bl();
	if (m > 6) throw RangeError("table style borders");
	let h = [];
	for (let r = 0; r < m; r++) {
		if (!n.bl()) continue;
		n.bl(), n.bl();
		let r = e.cmc(!0).color, i = n.bl(), a = e.hr.hAbs(t), o = n.bl() === 0;
		n.bd(), h.push({
			lineweight: i,
			visible: o,
			color: r,
			ltypeHandle: a
		});
	}
	let g = a.color.kind !== "byBlock" || a.index !== 0, _ = {
		textStyleHandle: d,
		textHeight: f,
		alignment: l,
		textColor: u,
		fillColor: g ? a.color : {
			kind: "aci",
			index: 7
		},
		fillOn: g,
		borders: h.length === 6 ? h : void 0,
		dataType: o,
		unitType: s,
		format: c || void 0,
		overrides: i
	};
	return p && (_.margins = p), _;
}, Gn = (e, t) => {
	let { r: n } = e;
	n.rc();
	let r = e.text(), i = n.bl();
	e.hr.h(), n.bl(), n.bl();
	let a = Wn(e, t);
	e.text(), n.bl(), n.bl();
	let o = n.bl();
	if (o > 64) throw RangeError("table style cell styles");
	let s = {
		description: r || void 0,
		flowDirection: (a.overrides ?? 0) & 65536 ? 1 : 0,
		flags: i,
		horizontalMargin: a.margins?.[1],
		verticalMargin: a.margins?.[0],
		titleSuppressed: !1,
		headerSuppressed: !1
	};
	for (let r = 0; r < o; r++) {
		n.bl();
		let r = Wn(e, t);
		delete r.margins, delete r.overrides;
		let i = n.bl();
		n.bl();
		let a = e.text().toUpperCase();
		a === "_TITLE" || !a && i === 1 ? s.title = r : a === "_HEADER" || !a && i === 2 ? s.header = r : (a === "_DATA" || !a && i === 3) && (s.data = r);
	}
	return Hn(e, "TABLESTYLE"), s;
}, Kn = (e, t) => {
	let { r: n, v: r } = e, i = {};
	r >= 2010 && n.bs(), i.contentType = n.bs(), i.drawMLeaderOrder = n.bs(), i.drawLeaderOrder = n.bs(), i.maxLeaderPoints = n.bl(), i.firstSegmentAngle = n.bd(), i.secondSegmentAngle = n.bd(), i.leaderType = n.bs(), i.lineColor = e.cmc().color, i.ltypeHandle = e.hr.hAbs(t), i.lineweight = n.bl(), i.landing = n.b() === 1, i.landingGap = n.bd(), i.dogleg = n.b() === 1, i.doglegLength = n.bd(), i.description = e.text() || void 0, i.arrowHandle = e.hr.hAbs(t), i.arrowSize = n.bd(), i.defaultText = e.text() || void 0, i.textStyleHandle = e.hr.hAbs(t), i.textLeftAttachment = n.bs(), i.textRightAttachment = n.bs(), i.textAngleType = n.bs(), i.textAlignment = n.bs(), i.textColor = e.cmc().color, i.textHeight = n.bd(), i.textFrame = n.b() === 1, i.alwaysAlignLeft = n.b() === 1, i.alignSpace = n.bd(), i.blockHandle = e.hr.hAbs(t), i.blockColor = e.cmc().color;
	let [a, o, s] = n.bd3();
	return i.blockScale = K(a, o, s), i.useBlockScale = n.b() === 1, i.blockRotation = n.bd(), i.useBlockRotation = n.b() === 1, i.blockConnection = n.bs(), i.scale = n.bd(), i.propertyChanged = n.b() === 1, i.annotative = n.b() === 1, i.breakSize = n.bd(), r >= 2010 && (i.attachmentDirection = n.bs(), i.bottomAttachment = n.bs(), i.topAttachment = n.bs()), r >= 2013 && n.b(), Hn(e, "MLEADERSTYLE"), i;
}, X = (e, t, n) => {
	let { r, v: i } = e;
	switch (t) {
		case "TABLESTYLE":
			n.tableStyleObj = i >= 2010 ? Gn(e, n.handle) : Un(e, n.handle);
			return;
		case "MLEADERSTYLE":
			n.mleaderStyleObj = Kn(e, n.handle);
			return;
		case "ACAD_PROXY_OBJECT": {
			let { classId: r, proxyVersion: a, proxyMaint: o, fromDxf: s, magic: c } = gn(e), l = e.c.classes.get(r), u = l ? hn(l) : void 0;
			if (c) {
				let { dataBits: r, blob: i, strBits: o, strBlob: s } = mn(e), c = pn(e);
				n.unknownObject = {
					sourceType: l?.dxfName ?? t,
					appClass: u,
					encoding: a & 65535,
					data: r > 0 ? Zt(i) : void 0,
					dataBits: r > 0 ? r : void 0,
					strData: o > 0 ? Zt(s) : void 0,
					strBits: o > 0 ? o : void 0,
					refs: c.refs
				};
				return;
			}
			if (l && i >= 2e3 && !s) {
				let t = yn(e, a & 65535);
				if (t) {
					n.unknownObject = {
						sourceType: l.dxfName,
						appClass: u,
						...t,
						...e.xdata ? { xdata: e.xdata } : {}
					};
					return;
				}
			}
			n.proxyObject = {
				sourceType: l?.dxfName ?? t,
				appClass: u,
				proxyVersion: a,
				proxyMaint: o,
				fromDxf: s,
				...pn(e),
				...vn(e),
				...e.xdata ? { xdata: e.xdata } : {}
			};
			return;
		}
		case "BLOCKLINEARPARAMETER":
		case "BLOCKROTATIONPARAMETER":
		case "BLOCKFLIPPARAMETER":
		case "BLOCKALIGNMENTPARAMETER":
		case "BLOCKBASEPOINTPARAMETER":
		case "BLOCKXYPARAMETER":
		case "BLOCKPOLARPARAMETER":
		case "BLOCKPOINTPARAMETER":
		case "BLOCKLOOKUPPARAMETER": {
			let i = () => {
				let [e, t, n] = r.bd3();
				return K(e, t, n);
			}, a = () => {
				let e = r.bl(), t = r.bd(), n = r.bd(), i = r.bd(), a = r.bs();
				if (a < 0 || a > 1e4) throw RangeError("value set");
				let o = [];
				for (let e = 0; e < a; e++) o.push(r.bd());
				return {
					type: e,
					minimum: t,
					maximum: n,
					increment: i,
					allowed: o
				};
			};
			Mn(e);
			let o = e.text();
			r.bl(), r.bl(), r.bl(), r.b(), r.b();
			let s = {
				kind: t === "BLOCKLINEARPARAMETER" ? "linear" : t === "BLOCKROTATIONPARAMETER" ? "rotation" : t === "BLOCKFLIPPARAMETER" ? "flip" : t === "BLOCKALIGNMENTPARAMETER" ? "alignment" : t === "BLOCKXYPARAMETER" ? "xy" : t === "BLOCKPOLARPARAMETER" ? "polar" : t === "BLOCKPOINTPARAMETER" ? "point" : t === "BLOCKLOOKUPPARAMETER" ? "lookup" : "basePoint",
				name: o || void 0
			};
			if (s.kind === "basePoint" || s.kind === "point" || s.kind === "lookup") switch (s.firstPoint = i(), Nn(e), Nn(e), r.bl(), s.kind) {
				case "basePoint":
					i(), i();
					break;
				case "point":
					s.label = e.text() || void 0, s.description = e.text() || void 0, i();
					break;
				default: r.bl(), s.label = e.text() || void 0, s.description = e.text() || void 0;
			}
			else {
				s.firstPoint = i(), s.secondPoint = i();
				for (let t = 0; t < 4; t++) Nn(e);
				switch (r.bl(), r.bl(), r.bl(), r.bl(), r.bs(), s.kind) {
					case "linear":
						s.label = e.text() || void 0, s.description = e.text() || void 0, r.bd(), s.valueSet = a();
						break;
					case "rotation":
						s.point = i(), s.label = e.text() || void 0, s.description = e.text() || void 0, r.bd(), s.valueSet = a();
						break;
					case "flip":
						s.label = e.text() || void 0, s.description = e.text() || void 0, s.baseStateName = e.text() || void 0, s.flippedStateName = e.text() || void 0, i(), r.bl(), e.text();
						break;
					case "alignment":
						s.perpendicular = r.b() === 1;
						break;
					case "xy":
						s.label2 = e.text() || void 0, s.label = e.text() || void 0, s.description2 = e.text() || void 0, s.description = e.text() || void 0, r.bd(), r.bd(), s.valueSet = a(), s.valueSet2 = a();
						break;
					case "polar": s.label = e.text() || void 0, s.description = e.text() || void 0, s.label2 = e.text() || void 0, s.description2 = e.text() || void 0, r.bd(), s.valueSet = a(), s.valueSet2 = a();
				}
			}
			s.valueSet && !s.valueSet.allowed.length && s.valueSet.type === 0 && delete s.valueSet, n.blockParam = s;
			return;
		}
		case "BLOCKMOVEACTION":
		case "BLOCKROTATEACTION":
		case "BLOCKSCALEACTION":
		case "BLOCKSTRETCHACTION":
		case "BLOCKPOLARSTRETCHACTION":
		case "BLOCKFLIPACTION":
		case "BLOCKARRAYACTION":
		case "BLOCKLOOKUPACTION":
			n.blockAction = t.replace(/^BLOCK/, "").replace(/ACTION$/, "").toLowerCase();
			return;
		case "BLOCKVISIBILITYPARAMETER": {
			Mn(e);
			let t = e.text();
			r.bl(), r.bl(), r.bl(), r.b(), r.b(), r.bd3(), Nn(e), Nn(e), r.bl(), r.b();
			let i = e.text() || t, a = e.text();
			r.b();
			let o = r.bl();
			if (o < 0 || o > 1e6) throw RangeError("visibility members");
			let s = [];
			for (let t = 0; t < o; t++) s.push(e.handle(n.handle));
			let c = r.bl();
			if (c < 0 || c > 1e5) throw RangeError("visibility states");
			let l = [];
			for (let t = 0; t < c; t++) {
				let t = e.text(), i = [], a = r.bl();
				if (a < 0 || a > 1e6) throw RangeError("visibility state members");
				for (let t = 0; t < a; t++) i.push(e.handle(n.handle));
				let o = r.bl();
				if (o < 0 || o > 1e6) throw RangeError("visibility state params");
				for (let t = 0; t < o; t++) e.handle(n.handle);
				l.push({
					name: t,
					visible: i
				});
			}
			n.visibility = {
				name: i,
				prompt: a,
				members: s,
				states: l
			};
			return;
		}
		case "TABLECONTENT":
			n.tableContent = zn(e), n.tableContent.cellBlocks && (n.tableCellBlocks = n.tableContent.cellBlocks), n.tableContent.cellTextStyles && (n.tableCellTextStyles = n.tableContent.cellTextStyles);
			return;
		case "PDFDEFINITION":
		case "DGNDEFINITION":
		case "DWFDEFINITION":
			n.underlayDef = {
				path: e.text(),
				itemName: e.text()
			};
			return;
		case "GEODATA": {
			let t = r.bl();
			e.handle(n.handle);
			let i = {
				version: t,
				coordinatesType: r.bs(),
				designPoint: {
					x: 0,
					y: 0,
					z: 0
				},
				referencePoint: {
					x: 0,
					y: 0,
					z: 0
				}
			}, a = () => {
				let [e, t, n] = r.bd3();
				return K(e, t, n);
			};
			if (t <= 1) {
				i.referencePoint = a(), i.horizontalUnits = r.bl(), i.verticalUnits = i.horizontalUnits, i.designPoint = a(), a(), i.upDirection = a();
				let t = Math.PI / 2 - r.bd();
				i.northDirection = {
					x: Math.cos(t),
					y: Math.sin(t)
				}, a(), i.coordinateSystem = e.text() || void 0, i.geoRssTag = e.text() || void 0, i.horizontalUnitScale = r.bd(), i.verticalUnitScale = i.horizontalUnitScale, e.text(), e.text();
			} else i.designPoint = a(), i.referencePoint = a(), i.horizontalUnitScale = r.bd(), i.horizontalUnits = r.bl(), i.verticalUnitScale = r.bd(), i.verticalUnits = r.bl(), i.upDirection = a(), i.northDirection = {
				x: r.rd(),
				y: r.rd()
			}, i.scaleEstimation = r.bl(), i.userScaleFactor = r.bd(), i.seaLevelCorrection = r.b() === 1, i.seaLevelElevation = r.bd(), i.projectionRadius = r.bd(), i.coordinateSystem = e.text() || void 0, i.geoRssTag = e.text() || void 0;
			e.text(), e.text(), e.text();
			let o = r.bl();
			if (o >= 0 && o <= 1e5) {
				for (let e = 0; e < o; e++) r.rd(), r.rd(), r.rd(), r.rd();
				let e = r.bl();
				if (e >= 0 && e <= 1e5) for (let t = 0; t < e; t++) r.bl(), r.bl(), r.bl();
			}
			let s = /<georss:point>\s*([-\d.eE+]+)\s+([-\d.eE+]+)/.exec(i.geoRssTag ?? "");
			s && (i.latitude = parseFloat(s[1]), i.longitude = parseFloat(s[2])), n.geoData = i;
			return;
		}
		case "LAYER": {
			let t = {
				kind: "layer",
				name: e.tableFlags()
			};
			if (e.lastXrefDependent && (t.xrefDependent = !0), n.table = t, i <= 14) t.frozen = r.b() === 1, t.off = r.b() === 1, r.b(), t.locked = r.b() === 1, t.plot = !0;
			else {
				let e = r.bs();
				t.frozen = !!(e & 1), t.off = !!(e & 2), t.locked = !!(e & 8), t.plot = !!(e & 16), t.lineweight = rn((e & 992) >> 5);
			}
			let { color: a, index: o } = e.cmc();
			t.colorIndex = o, a.kind === "rgb" && (t.rgb = a.rgb), o < 0 && (t.off = !0), i >= 2e3 && e.hr.h(), i >= 2007 && e.hr.h(), t.ltypeHandle = e.handle(n.handle);
			return;
		}
		case "STYLE": {
			let t = e.tableFlags(), i = e.lastXrefDependent, a = r.b() === 1;
			r.b();
			let o = r.bd(), s = r.bd(), c = r.bd();
			r.rc(), r.bd();
			let l = e.text(), u = e.text();
			n.table = {
				kind: "style",
				name: t,
				font: l || void 0,
				bigFont: u || void 0,
				fixedHeight: o || void 0,
				widthFactor: s === 1 ? void 0 : s,
				oblique: c || void 0,
				shapeFile: a || void 0,
				xrefDependent: i || void 0,
				xdata: e.xdata
			};
			return;
		}
		case "LTYPE": {
			let t = e.tableFlags(), a = e.lastXrefDependent, o = e.text();
			r.bd(), r.rc();
			let s = r.rc(), c = [], l = !1;
			for (let t = 0; t < s; t++) c.push(r.bd()), r.bs(), e.hr.h(), r.rd(), r.rd(), r.bd(), r.bd(), r.bs() & 2 && (l = !0);
			i <= 2004 ? r.bytes(256) : l && r.bytes(512), n.table = {
				kind: "ltype",
				name: t,
				description: o,
				pattern: c,
				xrefDependent: a || void 0
			};
			return;
		}
		case "BlockRecord": {
			let t = {
				kind: "blockHeader",
				name: e.tableFlags(),
				xdata: e.xdata
			};
			n.table = t, t.anonymous = r.b() === 1, r.b();
			let a = r.b() === 1, o = r.b() === 1;
			i >= 2e3 && r.b();
			let s = 0;
			i >= 2004 && !a && !o && (s = r.bl());
			let [c, l, u] = r.bd3();
			t.basePoint = K(c, l, u);
			let d = e.text();
			(a || o) && (t.xrefPath = d, t.xrefOverlay = o);
			let f = 0;
			if (i >= 2e3) {
				for (; r.rc() !== 0;) f++;
				e.text();
				let t = r.bl();
				t > 0 && t < 10485760 && r.bytes(t);
			}
			if (i >= 2007 && (r.bs(), r.b(), r.rc()), e.hr.h(), i <= 2e3 && !a && !o && (t.firstEntity = e.handle(n.handle), t.lastEntity = e.handle(n.handle)), i >= 2004 && (t.ownedHandles = [], s < 15728640)) for (let r = 0; r < s; r++) t.ownedHandles.push(e.handle(n.handle));
			if (e.hr.h(), i >= 2e3) {
				for (let t = 0; t < f && t < 15728640; t++) e.hr.h();
				e.hr.h();
			}
			return;
		}
		case "BlockTable": {
			let t = r.bl(), a = i < 2007 ? e.r : e.hr, o = { kind: "blockControl" };
			n.table = o, a.h();
			for (let t = 0; t < e.numReactors; t++) a.h();
			(i < 2004 || !e.xdicMissing) && a.h();
			let s = [];
			for (let e = 0; e < t && e < 1e5; e++) s.push(Oe(a.h(), n.handle));
			o.ownedHandles = s, o.modelSpace = Oe(a.h(), n.handle), o.paperSpace = Oe(a.h(), n.handle);
			return;
		}
		case "LinetypeTable": {
			let t = r.bl(), a = i < 2007 ? e.r : e.hr;
			a.h();
			for (let t = 0; t < e.numReactors; t++) a.h();
			(i < 2004 || !e.xdicMissing) && a.h();
			let o = [];
			for (let e = 0; e < t && e < 1e5; e++) o.push(Oe(a.h(), n.handle));
			n.table = {
				kind: "tableControl",
				ownedHandles: o
			};
			return;
		}
		case "APPID":
			n.table = {
				kind: "appid",
				name: e.tableFlags()
			};
			return;
		case "DIMSTYLE":
			n.table = {
				kind: "dimstyle",
				name: e.tableFlags()
			};
			return;
		case "DICTIONARY":
		case "ACDBDICTIONARYWDFLT": {
			let a = r.bl();
			if (a > 1e5) return;
			let o = i >= 2e3 ? r.bs() : void 0, s = i >= 14 ? r.rc() !== 0 : void 0, c = [];
			for (let t = 0; t < a; t++) c.push(e.text());
			let l = [], u = [];
			for (let t = 0; t < a; t++) {
				let t = e.hr.h();
				u.push(t.code), l.push(t.code === 6 ? n.handle + 1 : t.code === 8 ? n.handle - 1 : t.code === 10 ? n.handle + t.value : t.code === 12 ? n.handle - t.value : t.value);
			}
			n.dictionary = {
				names: c,
				handles: l,
				codes: u,
				cloning: o,
				hardOwner: s
			}, t === "ACDBDICTIONARYWDFLT" && (n.dictionary.defaultHandle = e.handle(n.handle));
			return;
		}
		case "GROUP": {
			let t = e.text(), i = r.bs(), a = r.bs(), o = r.bl();
			if (o > 1e5) return;
			let s = [];
			for (let t = 0; t < o; t++) s.push(e.handle(n.handle));
			n.group = {
				name: i ? "*A" : "",
				description: t || void 0,
				selectable: a !== 0,
				members: s
			};
			return;
		}
		case "MLINESTYLE": {
			let t = e.text(), a = e.text(), o = r.bs(), { color: s } = e.cmc(), c = r.bd(), l = r.bd(), u = r.rc();
			if (u > 64) return;
			let d = [];
			for (let t = 0; t < u; t++) {
				let t = r.bd(), { color: n } = e.cmc(), a = {
					offset: t,
					color: n
				};
				i < 2018 && (a.ltypeIndex = r.bs()), d.push(a);
			}
			if (i >= 2018) for (let t = 0; t < u; t++) {
				let r = e.handle(n.handle);
				r && (d[t].ltypeHandle = r);
			}
			n.mlineStyle = {
				name: t,
				description: a || void 0,
				flags: o,
				fillColor: s,
				startAngle: c,
				endAngle: l,
				elements: d
			};
			return;
		}
		case "LAYOUT": {
			e.text();
			let t = e.text();
			r.bs();
			for (let e = 0; e < 6; e++) r.bd();
			e.text(), r.bd(), r.bd(), r.bs(), r.bs(), r.bs(), r.bd(), r.bd(), r.bd(), r.bd(), i <= 2002 ? e.text() : e.hr.h(), r.bd(), r.bd();
			let a = e.text();
			r.bs(), r.bd(), r.bd(), r.bd(), i >= 2004 && (r.bs(), r.bs(), r.bs()), i >= 2007 && e.hr.h();
			let o = e.text(), s = r.bs();
			r.bs();
			let [c, l, u] = r.bd3(), d = {
				x: r.rd(),
				y: r.rd()
			}, f = {
				x: r.rd(),
				y: r.rd()
			};
			r.bd3(), r.bd3(), r.bd3(), r.bd(), r.bs();
			let [p, m, h] = r.bd3(), [g, _, v] = r.bd3();
			n.layout = {
				name: o,
				tabOrder: s,
				limMin: d,
				limMax: f,
				extMin: K(p, m, h),
				extMax: K(g, _, v),
				insBase: K(c, l, u),
				paperSize: t || void 0,
				plotStyleSheet: a || void 0
			}, i >= 2004 && r.bl(), n.layout.blockHandle = e.handle(n.handle);
			return;
		}
		case "UCS": {
			let t = e.tableFlags(), [a, o, s] = r.bd3(), [c, l, u] = r.bd3(), [d, f, p] = r.bd3();
			if (n.table = {
				kind: "ucs",
				name: t
			}, n.ucs = {
				name: t,
				origin: K(a, o, s),
				xAxis: K(c, l, u),
				yAxis: K(d, f, p)
			}, i >= 2e3) {
				n.ucs.elevation = r.bd(), n.ucs.orthoViewType = r.bs();
				let t = r.bs();
				if (t < 0 || t > 64) return;
				let i = [];
				for (let e = 0; e < t; e++) {
					let e = r.bs(), [t, n, a] = r.bd3();
					i.push({
						type: e,
						origin: K(t, n, a)
					});
				}
				i.length && (n.ucs.orthoOrigins = i);
				let a = e.handle(n.handle);
				a && (n.ucs.baseUcsHandle = a), e.hr.h();
			}
			return;
		}
		case "DICTIONARYVAR":
			n.dictionaryVar = {
				schema: r.rc(),
				value: e.text()
			};
			return;
		case "VIEW": {
			let t = e.tableFlags(), a = r.bd(), o = r.bd(), s = r.rd(), c = r.rd(), [l, u, d] = r.bd3(), [f, p, m] = r.bd3(), h = r.bd(), g = r.bd(), _ = r.bd(), v = r.bd(), y = r.b() | r.b() << 1 | r.b() << 2;
			r.b();
			let b = i >= 2e3 ? r.rc() : void 0;
			i >= 2007 && (r.b(), r.rc(), r.bd(), r.bd(), e.cmc());
			let x = r.b() === 1, S = {
				name: t,
				center: {
					x: s,
					y: c
				},
				height: a,
				width: o,
				direction: K(f, p, m),
				target: K(l, u, d),
				lensLength: g || void 0,
				twist: h,
				frontClip: _,
				backClip: v,
				viewMode: y
			};
			if (b !== void 0 && (S.renderMode = b), x && (S.paperSpace = !0), i >= 2e3 && r.b() === 1) {
				let [e, t, n] = r.bd3(), [i, a, o] = r.bd3(), [s, c, l] = r.bd3();
				S.ucsOrigin = K(e, t, n), S.ucsXAxis = K(i, a, o), S.ucsYAxis = K(s, c, l), S.ucsElevation = r.bd(), S.ucsOrthoType = r.bs();
			}
			n.table = {
				kind: "view",
				name: t
			}, n.view = S;
			return;
		}
		case "VPORT": {
			let t = e.tableFlags(), a = r.bd(), o = r.bd(), s = Number.isFinite(o) && Number.isFinite(a) && a > 0 && o > 0 ? o / a : void 0, c = r.rd(), l = r.rd(), [u, d, f] = r.bd3(), [p, m, h] = r.bd3(), g = r.bd(), _ = r.bd(), v = r.bd(), y = r.bd(), b = r.b() | r.b() << 1 | r.b() << 2;
			r.b();
			let x = i >= 2e3 ? r.rc() : void 0;
			i >= 2007 && (r.b(), r.rc(), r.bd(), r.bd(), e.cmc());
			let S = r.rd(), C = r.rd(), w = r.rd(), ee = r.rd(), T = r.b() === 1, E = r.bs(), D = r.b() === 1, te = r.b() | r.b() << 1, ne = r.b() === 1, re = r.rd(), O = r.rd(), k = r.b() === 1, A = r.b(), j = r.bs(), M = r.bd(), N = r.rd(), P = r.rd(), F = r.rd(), ie = r.rd(), ae = {
				name: t,
				lowerLeft: {
					x: S,
					y: C
				},
				upperRight: {
					x: w,
					y: ee
				},
				center: {
					x: c,
					y: l
				},
				height: a,
				aspectRatio: s,
				direction: K(p, m, h),
				target: K(u, d, f),
				twist: g,
				lensLength: _,
				frontClip: v,
				backClip: y,
				viewMode: b,
				circleSides: E,
				fastZoom: D,
				ucsIcon: te,
				ucsFollow: T,
				gridOn: ne,
				snapOn: k,
				snapStyle: A,
				snapIsoPair: j,
				snapAngle: M,
				snapBase: {
					x: N,
					y: P
				},
				snapSpacing: {
					x: F,
					y: ie
				},
				gridSpacing: {
					x: re,
					y: O
				}
			};
			if (x !== void 0 && (ae.renderMode = x), i >= 2e3) {
				ae.ucsIcon = te | r.b() << 2, ae.ucsPerViewport = r.b() === 1;
				let [e, t, n] = r.bd3(), [i, a, o] = r.bd3(), [s, c, l] = r.bd3();
				ae.ucsOrigin = K(e, t, n), ae.ucsXAxis = K(i, a, o), ae.ucsYAxis = K(s, c, l), ae.ucsElevation = r.bd(), ae.ucsOrthoType = r.bs();
			}
			n.table = {
				kind: "vport",
				name: t
			}, n.vport = ae;
			return;
		}
		case "XRECORD": {
			let t = r.bl();
			if (t < 0 || t > 16777216) return;
			let a = r.pos, o = Math.min(a + t * 8, r.endBit), s = [];
			for (; r.pos + 16 <= o;) {
				let t = r.rs();
				if (t < 0 || t >= 2e3) break;
				let n = tn(t);
				if (n === "string") {
					let n = r.rs();
					if (i >= 2007) {
						if (r.pos + n * 16 > o) break;
						let e = "";
						for (let t = 0; t < n; t++) e += String.fromCharCode(r.rs());
						s.push({
							code: t,
							value: we(e.replace(/\0+$/, ""))
						});
					} else {
						if (r.rc(), n < 0 || r.pos + n * 8 > o) break;
						s.push({
							code: t,
							value: we(Ve(r.bytes(n), e.c.codepage))
						});
					}
				} else if (n === "real") s.push({
					code: t,
					value: r.rd()
				});
				else if (n === "point") s.push({
					code: t,
					point: {
						x: r.rd(),
						y: r.rd(),
						z: r.rd()
					}
				});
				else if (n === "int8" || n === "bool") s.push({
					code: t,
					value: r.rc()
				});
				else if (n === "int16") {
					let e = r.rs();
					s.push({
						code: t,
						value: e >= 32768 ? e - 65536 : e
					});
				} else if (n === "int32") {
					let e = r.rl();
					s.push({
						code: t,
						value: e > 2147483647 ? e - 4294967296 : e
					});
				} else if (n === "int64") s.push({
					code: t,
					value: r.rll()
				});
				else if (n === "binary") {
					let e = r.rc();
					if (r.pos + e * 8 > o) break;
					let n = "";
					for (let t of r.bytes(e)) n += t.toString(16).padStart(2, "0").toUpperCase();
					s.push({
						code: t,
						value: n
					});
				} else if (n === "handle") s.push({
					code: t,
					value: r.rll().toString(16).toUpperCase()
				});
				else break;
			}
			r.pos = Math.min(o, e.dataEnd, r.endBit), i >= 2e3 && r.pos + 2 <= Math.min(e.dataEnd, r.endBit) && r.bs(), n.xrecord = { values: s };
			return;
		}
		case "IMAGEDEF":
			if (r.bl() > 10) return;
			r.rd(), r.rd(), n.imageDef = { path: e.text() || void 0 };
			return;
		case "SORTENTSTABLE": {
			let t = r.bl();
			if (t < 0 || t > 5e6) throw RangeError("sortents count");
			let i = [];
			for (let e = 0; e < t; e++) i.push(r.hValue());
			let a = e.hr.hAbs(n.handle), o = [];
			for (let r = 0; r < t; r++) o.push(e.hr.hAbs(n.handle));
			n.sortents = {
				blockOwner: a,
				ents: o,
				sorts: i
			};
			return;
		}
		default: return;
	}
}, qn = (e, t, n) => {
	let r = new z(e), i;
	if (t.v >= 2010) {
		let e = r.bb();
		i = e === 0 ? r.rc() : e === 1 ? r.rc() + 496 : r.rs();
	} else i = r.bs();
	let a;
	a = t.v >= 2e3 && t.v <= 2007 ? r.rl() : t.v >= 2010 ? n ?? e.length * 8 : e.length * 8, a > e.length * 8 && (a = e.length * 8);
	let o = Qt[i], s = o ? $t(i) : !1;
	if (!o) {
		let e = t.classes.get(i);
		o = e?.dxfName ?? `CLASS_${i}`, s = e?.isEntity ?? !1;
	}
	let c = new z(e, a), l = t.v >= 2007 ? sn(e, a) : null, u = l ? l.r : null, d = new ln(t, r, c, u, u ? u.pos : t.v >= 2007 ? Math.max(0, a - 1) : a);
	l && (d.srStart = l.r.pos, d.srBits = l.bits);
	let f = {
		handle: 0,
		typeName: o,
		isEntity: s
	};
	if (s) {
		let e = d.commonEntity();
		f.handle = e.handle, f.entmode = e.entmode, f.hasDsData = d.hasDsData || void 0, f.proxyGraphics = d.proxyGraphics, f.owner = d.ownerHandle, d.xdictHandle && (f.xdict = d.xdictHandle), f.layerHandle = d.layerHandle, f.ltypeFlags = e.ltypeFlags, f.ltypeHandle = d.ltypeHandle, f.prev = d.prevHandle, f.next = d.nextHandle;
		let n = null, a = r.pos, s = d.hr.pos, c = d.sr?.pos, l = !1;
		try {
			n = xn(d, o, f);
		} catch {
			l = !0;
		}
		let u = G.has(o) || o.startsWith("VERTEX_"), p = n?.type === "unknown" && n.data === void 0;
		if ((l || p) && !u) {
			r.pos = a, d.hr.pos = s, d.sr && c !== void 0 && (d.sr.pos = c);
			let e = t.classes.get(i);
			n = {
				type: "unknown",
				layer: "0",
				color: { kind: "byLayer" },
				sourceType: e?.dxfName ?? o,
				appClass: e ? hn(e) : void 0,
				typeCode: Qt[i] ? i : void 0,
				encoding: cn(t.v),
				...bn(d)
			};
		} else l && (n = null);
		return n ? (f.styleHandle = d.styleHandle, n.handle = f.handle.toString(16).toUpperCase(), d.xdictHandle && (n.xdict = d.xdictHandle.toString(16).toUpperCase()), d.reactors && (n.reactors = d.reactors.map((e) => e.toString(16).toUpperCase())), n.color = e.color, e.ltypeScale !== 1 && (n.linetypeScale = e.ltypeScale), e.lineweight !== void 0 && (n.lineweight = e.lineweight), e.invisible && (n.invisible = !0), d.xdata && (n.xdata = d.xdata), f.entity = n) : (f.polyline || f.mesh) && (f.folded = {
			color: e.color,
			ltypeScale: e.ltypeScale,
			lineweight: e.lineweight,
			invisible: e.invisible,
			xdata: d.xdata
		}), f;
	}
	let p = en.has(i);
	f.handle = d.commonObject(p).handle, f.owner = d.ownerHandle, d.xdictHandle && (f.xdict = d.xdictHandle), d.reactors && (f.reactors = d.reactors);
	let m = r.pos, h = d.hr.pos, g = d.sr?.pos, _ = !1;
	try {
		X(d, o, f);
	} catch {
		_ = !0;
	}
	let v = t.classes.get(i), y = f.dictionary || f.layout || f.group || f.xrecord || f.imageDef || f.underlayDef || f.visibility || f.blockParam || f.blockAction || f.tableContent || f.geoData || f.mlineStyle || f.table || f.proxyObject || f.ucs || f.view || f.vport || f.sortents || f.tableStyleObj || f.mleaderStyleObj || f.dictionaryVar;
	return (_ && !y || v && !y && !p || !y && !p && Kt.has(o) || !_ && y && Gt.has(o)) && (r.pos = m, d.hr.pos = h, d.sr && g !== void 0 && (d.sr.pos = g), f.unknownObject = {
		sourceType: v?.dxfName ?? o,
		appClass: v ? hn(v) : void 0,
		typeCode: Qt[i] ? i : void 0,
		encoding: cn(t.v),
		...bn(d),
		...d.xdata ? { xdata: d.xdata } : {}
	}), f;
}, Jn = /* @__PURE__ */ new Set([
	"ACAD_LAYOUT",
	"ACAD_GROUP",
	"ACAD_MLINESTYLE",
	"ACAD_TABLESTYLE",
	"ACAD_MLEADERSTYLE",
	"ACDBVARIABLEDICTIONARY"
]), Yn = (t, n = {}) => {
	let r = a(t), o = i(r);
	if (o < 13) return Wt(t);
	let l, u, d, f, p, m, h;
	if (o <= 2e3) {
		let e = c(t);
		h = e.codepage;
		let n = (n) => {
			let r = e.sections.find((e) => e.id === n);
			return r ? t.subarray(r.address, r.address + r.size) : void 0;
		};
		d = n(0), u = n(1);
		let r = n(2);
		if (!r) throw Error("DWG is missing its object map section.");
		l = r, m = t;
	} else {
		let e = o === 2007 ? oe(t) : w(t), n = e.get("AcDb:Handles"), r = e.get("AcDb:AcDbObjects");
		if (!n || !r) throw Error("DWG is missing its Handles/Objects sections.");
		l = n, m = r, u = e.get("AcDb:Classes"), d = e.get("AcDb:Header"), f = e.get("AcDb:SummaryInfo");
		for (let [t, n] of e) if (t.startsWith("AcDb:AcDs")) {
			p = n;
			break;
		}
		h = s(new DataView(t.buffer, t.byteOffset, t.byteLength).getUint16(19, !0)), o >= 2007 && (h = void 0);
	}
	let g = Xt(r, u ? We(u, r, h) : /* @__PURE__ */ new Map(), h, t[17]), _ = e();
	_.header.version = r, _.header.codepage = h;
	{
		let e = new DataView(t.buffer, t.byteOffset, t.byteLength), n = Ye(t, t.length > 17 ? e.getUint32(13, !0) : 0);
		if (n && (_.header.thumbnail = n), f) {
			let e = Ze(f, o >= 2007);
			e && (_.header.summary = e);
		}
	}
	let v = d ? Ke(d, r, t[11], h) : null;
	if (v) {
		let e = (e) => !!e && [
			e.x,
			e.y,
			e.z ?? 0
		].every((e) => Number.isFinite(e) && Math.abs(e) < 0x8ac7230489e80000);
		e(v.extMin) && e(v.extMax) && (_.header.extMin = v.extMin, _.header.extMax = v.extMax), e(v.limMin) && e(v.limMax) && (_.header.limMin = v.limMin, _.header.limMax = v.limMax), v.insUnits !== void 0 && (_.header.insUnits = v.insUnits);
		let t = (e) => !!e && e.origin.x === 0 && e.origin.y === 0 && e.origin.z === 0 && e.xAxis.x === 1 && e.xAxis.y === 0 && e.xAxis.z === 0 && e.yAxis.x === 0 && e.yAxis.y === 1 && e.yAxis.z === 0, n = (e) => !!e && [
			e.origin,
			e.xAxis,
			e.yAxis
		].every((e) => [
			e.x,
			e.y,
			e.z
		].every((e) => Number.isFinite(e) && Math.abs(e) < 0x8ac7230489e80000));
		n(v.ucs) && !t(v.ucs) && (_.header.ucs = v.ucs), n(v.pUcs) && !t(v.pUcs) && (_.header.pUcs = v.pUcs), v.ltScale && v.ltScale > 0 && v.ltScale !== 1 && (_.header.linetypeScale = v.ltScale), v.pdMode !== void 0 && ((_.header.vars ??= {}).PDMODE = v.pdMode), v.pdSize !== void 0 && ((_.header.vars ??= {}).PDSIZE = v.pdSize);
		for (let [e, t] of Object.entries(v.vars)) (_.header.vars ??= {})[e] = t;
	}
	let y = /* @__PURE__ */ new Map(), b = se(l), x = 0;
	for (let e = 0; e < b.count; e++) b.handles[e] > x && (x = b.handles[e]);
	let S = x > 0 && x < b.count * 8 + 4096, C = S ? Array(x + 1).fill(void 0) : null, ee = S ? null : /* @__PURE__ */ new Map(), T = /* @__PURE__ */ new Map(), E = {
		get(e) {
			return C ? e >= 0 && e <= x ? C[e] : T.get(e) : ee.get(e);
		},
		set(e, t) {
			C ? e >= 0 && e <= x ? C[e] = t : T.set(e, t) : ee.set(e, t);
		}
	}, D = [], te = 0, ne = 0;
	for (let e = 0; e < b.count; e++) {
		let t = b.handles[e], r = b.offsets[e];
		try {
			if (r < 0 || r + 2 > m.length) throw RangeError("offset");
			let e = r, i = 0, a = 0;
			for (;;) {
				let t = m[e] | m[e + 1] << 8;
				if (e += 2, i += (t & 32767) * 2 ** a, !(t & 32768)) break;
				a += 15;
			}
			let s;
			if (o >= 2010) {
				let t = 0, n = 0;
				for (;;) {
					let r = m[e++];
					if (t += (r & 127) * 2 ** n, !(r & 128)) break;
					n += 7;
				}
				s = i * 8 - t;
			}
			let c = m.subarray(e, e + i);
			if (c.length < i) throw RangeError("body");
			if (n.checkCrc) {
				let t = e + i;
				if (t + 2 <= m.length) {
					let e = m[t] | m[t + 1] << 8, n = B(49345, m, r, t);
					te++, n !== e && ne++;
				}
			}
			let l = qn(c, g, s);
			l && (l.handle ||= t, n.retainRecords && l.entity && (l.entity.record = {
				data: Zt(c.slice()),
				handleBits: o >= 2010 && s !== void 0 ? i * 8 - s : void 0,
				encoding: cn(o)
			}), E.set(l.handle, l), l.fileIndex = D.length, D.push(l));
		} catch (e) {
			let t = e instanceof Error ? e.constructor.name : "Error";
			y.set(t, (y.get(t) ?? 0) + 1);
		}
	}
	let re = /* @__PURE__ */ new Map(), O = /* @__PURE__ */ new Map(), k = /* @__PURE__ */ new Map(), A = /* @__PURE__ */ new Map(), j = /* @__PURE__ */ new Map(), M = [], N = /* @__PURE__ */ new Map(), P, F, ie = 0, ae = 0;
	_.layers = [], _.linetypes = [], _.textStyles = [];
	for (let e of D) {
		let t = e.table;
		if (t) switch (t.kind) {
			case "layer": {
				let n = t.name || "0";
				re.set(e.handle, n);
				let r = {
					name: n,
					color: t.rgb === void 0 ? {
						kind: "aci",
						index: Math.abs(t.colorIndex ?? 7) || 7
					} : {
						kind: "rgb",
						rgb: t.rgb
					},
					on: !t.off,
					frozen: !!t.frozen,
					locked: !!t.locked,
					plottable: t.plot,
					lineweight: t.lineweight,
					handle: e.handle.toString(16).toUpperCase()
				};
				t.xrefDependent && (r.xrefDependent = !0), e.xdict && (r.xdict = e.xdict.toString(16).toUpperCase()), _.layers.push(r), t.ltypeHandle && (r.linetype = "#" + t.ltypeHandle.toString(16));
				break;
			}
			case "ltype":
				O.set(e.handle, t.name || "Continuous"), _.linetypes.push({
					name: t.name || "Continuous",
					description: t.description,
					pattern: t.pattern ?? [],
					handle: e.handle.toString(16).toUpperCase(),
					...t.xrefDependent ? { xrefDependent: !0 } : {},
					...e.xdict ? { xdict: e.xdict.toString(16).toUpperCase() } : {}
				});
				break;
			case "style":
				j.set(e.handle, t.name || "Standard");
				{
					let n = {
						name: t.name || "Standard",
						font: t.font,
						bigFont: t.bigFont,
						fixedHeight: t.fixedHeight,
						widthFactor: t.widthFactor,
						oblique: t.oblique,
						handle: e.handle.toString(16).toUpperCase()
					};
					t.shapeFile && (n.shapeFile = !0), t.xrefDependent && (n.xrefDependent = !0), e.xdict && (n.xdict = e.xdict.toString(16).toUpperCase()), t.xdata && M.push({
						st: n,
						xd: t.xdata
					}), _.textStyles.push(n);
				}
				break;
			case "blockHeader":
				N.set(e.handle, e), !ie && /^\*model_space$/i.test(t.name ?? "") && (P = e.handle), !ae && /^\*paper_space$/i.test(t.name ?? "") && (F = e.handle);
				break;
			case "blockControl":
				t.modelSpace && (P = ie = t.modelSpace), t.paperSpace && (F = ae = t.paperSpace);
				break;
			case "appid":
				t.name && k.set(e.handle, t.name);
				break;
			case "dimstyle": t.name && A.set(e.handle, t.name);
		}
	}
	for (let { st: e, xd: t } of M) for (let n of t) if ((n.appName ?? (n.appHandle ? k.get(parseInt(n.appHandle, 16)) : void 0)) === "ACAD") for (let t of n.values) "value" in t && (t.code === 1e3 && typeof t.value == "string" && !e.typeface && (e.typeface = t.value), t.code === 1071 && typeof t.value == "number" && (t.value & 16777216 && (e.italic = !0), t.value & 33554432 && (e.bold = !0)));
	_.layers.length || (_.layers = e().layers);
	for (let e of _.layers) if (e.linetype?.startsWith("#")) {
		let t = parseInt(e.linetype.slice(1), 16);
		e.linetype = O.get(t) ?? void 0;
	}
	if (v?.clayerHandle) {
		let e = re.get(v.clayerHandle);
		e && ((_.header.vars ??= {}).CLAYER = e);
	}
	for (let e of D) if (e.geoData) {
		_.geoData = e.geoData;
		break;
	}
	let I = [];
	for (let e of D) e.tableContent && I.push(e);
	if (I.length) {
		let e = /* @__PURE__ */ new Map();
		for (let t of I) t.owner !== void 0 && e.set(t.owner, t);
		let t = D.filter((e) => e.typeName === "ACAD_TABLE" && (e.entity?.type !== "table" || e.entity.cells.length === 0));
		for (let n = 0; n < t.length; n++) {
			let r = t[n], i = e.get(r.handle) ?? (t.length === I.length ? I[n] : void 0);
			if (!i?.tableContent || !r.entity) continue;
			let a = r.entity, { cellBlocks: o, cellTextStyles: s, ...c } = i.tableContent;
			o && (r.tableCellBlocks = o), s && (r.tableCellTextStyles = s), r.entity = {
				type: "table",
				layer: a.layer,
				color: a.color,
				handle: a.handle,
				xdata: a.xdata,
				position: a.type === "table" ? a.position : {
					x: 0,
					y: 0,
					z: 0
				},
				direction: a.type === "table" ? a.direction : {
					x: 1,
					y: 0,
					z: 0
				},
				...c
			};
		}
	}
	let ce = /* @__PURE__ */ new Map();
	for (let e of D) if ((e.vertex || e.pfaceFace) && e.owner !== void 0) {
		let t = ce.get(e.owner);
		t || ce.set(e.owner, t = []), t.push(e);
	}
	let le = (e, t) => {
		if (t.length) {
			let e = [];
			for (let n of t) {
				let t = E.get(n);
				t && (t.vertex || t.pfaceFace) && e.push(t);
			}
			if (e.length) return e;
		}
		let n = ce.get(e.handle);
		if (n?.length) return n;
		let r = e.fileIndex;
		if (r === void 0) return [];
		let i = [];
		for (let t = r + 1; t < D.length; t++) {
			let n = D[t];
			if (n.typeName === "SEQEND" || !n.vertex && !n.pfaceFace || n.owner !== void 0 && n.owner !== e.handle) break;
			i.push(n);
		}
		return i;
	}, ue = (e, t) => {
		let n = t.folded;
		n && (e.color = n.color, n.ltypeScale !== 1 && (e.linetypeScale = n.ltypeScale), n.lineweight !== void 0 && (e.lineweight = n.lineweight), n.invisible && (e.invisible = !0), n.xdata && (e.xdata = n.xdata));
	};
	for (let e of D) if (e.polyline) {
		let t = e.polyline, n = le(e, t.vertexHandles).filter((e) => e.vertex), r = [], i = [];
		for (let e of n) {
			let n = e.vertex, a = {
				x: n.x,
				y: n.y
			};
			t.is3d && (a.z = n.z), n.bulge && (a.bulge = n.bulge), n.startWidth && (a.startWidth = n.startWidth), n.endWidth && (a.endWidth = n.endWidth), n.id && (a.id = n.id), n.tangent !== void 0 && (a.tangent = n.tangent);
			let o = n.flags ?? 0;
			o & 1 && (a.curveFit = !0), t.splineFit && o & 16 ? r.push(a) : i.push(a);
		}
		let a = i.length >= 2 ? i : [...r, ...i];
		if (a.length < 2) continue;
		let o = {
			type: "polyline",
			layer: "0",
			color: { kind: "byLayer" },
			handle: e.handle.toString(16).toUpperCase(),
			vertices: a,
			closed: t.closed,
			heavy: t.is3d ? "3d" : "2d"
		};
		i.length >= 2 && r.length && (o.frame = r), t.splineFit ? o.fit = t.curveType === 6 ? "cubic" : "quadratic" : t.curveFit && (o.fit = "curve"), t.plineGen && (o.plineGen = !0), t.elevation && (o.elevation = t.elevation), t.extrusion && (o.extrusion = t.extrusion), ue(o, e), e.entity = o;
	} else if (e.mesh) {
		let t = le(e, e.mesh.vertexHandles), n = t.filter((e) => e.vertex);
		if (!n.length) continue;
		let r = {
			type: "mesh",
			layer: "0",
			color: { kind: "byLayer" },
			handle: e.handle.toString(16).toUpperCase(),
			meshKind: e.mesh.kind,
			vertices: n.map((e) => ({
				x: e.vertex.x,
				y: e.vertex.y,
				z: e.vertex.z
			}))
		};
		if (e.mesh.kind === "grid") r.mSize = e.mesh.m, r.nSize = e.mesh.n, e.mesh.closedM && (r.closedM = !0), e.mesh.closedN && (r.closedN = !0);
		else {
			let e = t.filter((e) => e.pfaceFace).map((e) => e.pfaceFace.filter((e) => e !== 0));
			e.length && (r.faces = e);
		}
		ue(r, e), e.entity = r;
	}
	{
		let e = (e) => {
			for (let t of e ?? []) if ((t.appName ?? (t.appHandle ? k.get(parseInt(t.appHandle, 16)) : void 0))?.toLowerCase() === "acdbdynamicblocktruename") {
				for (let e of t.values) if ("value" in e && e.code === 1e3 && typeof e.value == "string" && e.value) return e.value;
			}
		}, t = (e) => e.anonymous === !0 && /^\*.$/.test(e.name ?? ""), n = /* @__PURE__ */ new Set();
		for (let e of N.values()) {
			let r = e.table;
			r?.name && !t(r) && n.add(r.name);
		}
		let r = /* @__PURE__ */ new Set(), i = F === void 0 ? void 0 : N.get(F);
		i?.table?.name && /^\*paper_space$/i.test(i.table.name) && r.add(i.table.name);
		for (let a of N.values()) {
			let o = a.table;
			if (!o?.name || a === i && r.has(o.name)) continue;
			let s = t(o);
			if (s && o.name === "*U") {
				let t = e(o.xdata);
				if (t && !n.has(t) && !r.has(t)) {
					o.name = t, o.anonymous = !1, r.add(t);
					continue;
				}
			}
			if (!s && !r.has(o.name)) {
				r.add(o.name);
				continue;
			}
			let c = s ? 1 : 2;
			for (; r.has(o.name + c);) c++;
			o.name += c, r.add(o.name);
		}
	}
	let de = /* @__PURE__ */ new Map(), fe = [], pe = 0;
	for (let e of D) {
		let t = e.entity;
		if (!t) continue;
		if (e.layerHandle !== void 0 && (t.layer = re.get(e.layerHandle) ?? "0"), e.styleHandle !== void 0 && (t.type === "text" || t.type === "mtext")) {
			let n = j.get(e.styleHandle);
			n && (t.style = n);
		}
		if (e.ltypeFlags === 3 && e.ltypeHandle !== void 0 ? t.linetype = O.get(e.ltypeHandle) : e.ltypeFlags === 2 ? t.linetype = "Continuous" : e.ltypeFlags === 1 && (t.linetype = "ByBlock"), t.type === "insert" && e.insert) {
			t.blockName = N.get(e.insert.blockHeader)?.table?.name ?? "";
			let n = [...e.insert.attribs];
			if (!n.length && e.insert.chain) {
				let t = /* @__PURE__ */ new Set(), r = e.insert.chain.first;
				for (; r && !t.has(r) && (t.add(r), n.push(r), r !== e.insert.chain.last);) r = E.get(r)?.next;
			}
			let r = n.map((e) => E.get(e)?.entity).filter((e) => !!e && e.type === "text");
			r.length && (t.attributes = r);
		}
		if (t.type === "unknown" && e.proxyGraphics) {
			let n = et(e.proxyGraphics, t.layer, t.color);
			n.length && (t.graphics = n), t.graphicsData = Zt(e.proxyGraphics);
		}
		if (t.type === "proxy" && e.proxyGraphics) {
			let n = et(e.proxyGraphics, t.layer, t.color);
			n.length && (t.graphics = n), t.graphicsData = Zt(e.proxyGraphics);
		}
		let n = (e) => {
			if (!e.attdef || e.tag) return;
			let t = E.get(parseInt(e.attdef, 16))?.attTag;
			t && (e.tag = t);
		};
		if (t.type === "mleader" && e.mleaderBlock !== void 0) {
			let n = N.get(e.mleaderBlock);
			n?.table?.name && (t.blockName = n.table.name);
		}
		if (t.type === "mleader" && t.attributes && t.attributes.forEach(n), t.type === "dimension" && e.dimBlock !== void 0) {
			let n = N.get(e.dimBlock);
			n?.table?.name && (t.blockName = n.table.name);
		}
		if (t.type === "table" && e.tableBlock !== void 0) {
			let n = N.get(e.tableBlock);
			n?.table?.name && (t.blockName = n.table.name);
		}
		if (t.type === "table" && e.tableCellBlocks) for (let [n, r] of e.tableCellBlocks) {
			let e = N.get(r)?.table?.name, i = t.cells[n];
			e && i && (i.blockName = e);
		}
		if (t.type === "table" && e.tableCellTextStyles) for (let [n, r] of e.tableCellTextStyles) {
			let e = j.get(r), i = t.cells[n];
			e && i && (i.textStyle = e);
		}
		if (t.type === "table") for (let e of t.cells) e?.attributes?.forEach(n);
		if (t.type === "dimension" && e.dimStyleHandle !== void 0) {
			let n = A.get(e.dimStyleHandle);
			n && !/^standard$/i.test(n) && (t.style = n);
		}
		if (t.xdata) for (let e of t.xdata) {
			if (!e.appHandle) continue;
			let t = k.get(parseInt(e.appHandle, 16));
			t && (e.appName = t, delete e.appHandle);
		}
		if (t.type === "image" && e.imageDefHandle !== void 0) {
			let n = E.get(e.imageDefHandle);
			n?.imageDef?.path && (t.path = n.imageDef.path);
		}
		if (t.type === "underlay" && e.underlayDefHandle !== void 0) {
			let n = E.get(e.underlayDefHandle);
			n?.underlayDef && (n.underlayDef.path && (t.path = n.underlayDef.path), n.underlayDef.itemName && (t.itemName = n.underlayDef.itemName));
		}
		if (e.entmode === 2 || e.owner === P) _.entities.push(t);
		else if (e.entmode === 1 || e.owner === F) fe.push(t);
		else if (e.entmode === 0 && e.owner !== void 0) {
			let n = E.get(e.owner);
			if (n?.table?.kind === "blockHeader") {
				let n = de.get(e.owner);
				n || de.set(e.owner, n = []), n.push(t);
			} else n || (pe++, _.entities.push(t));
		}
	}
	pe && _.warnings.push(`${pe} entities reference a missing owner and were placed in model space`), fe.length && (_.paperSpace = fe);
	for (let [e, t] of N) {
		let n = t.table, r = n.name ?? "";
		if (e === P || e === F) continue;
		let i = de.get(e) ?? [];
		if (!i.length && n.ownedHandles?.length && (i = n.ownedHandles.map((e) => E.get(e)?.entity).filter((e) => !!e)), /^\*(model_space|paper_space)/i.test(r) && !i.length) continue;
		let a = {
			name: r,
			basePoint: n.basePoint ?? {
				x: 0,
				y: 0,
				z: 0
			},
			entities: i,
			handle: e.toString(16).toUpperCase()
		};
		t.xdict && (a.xdict = t.xdict.toString(16).toUpperCase()), n.xrefPath !== void 0 && (a.xref = {
			path: n.xrefPath,
			...n.xrefOverlay ? { overlay: !0 } : {}
		}), _.blocks[r] = a;
	}
	{
		let e = (e) => {
			let t = 0;
			for (let n of e) n.type === "viewport" && (n.id = ++t);
		};
		e(_.paperSpace ?? []);
		for (let [t, n] of Object.entries(_.blocks)) /^\*paper_space/i.test(t) && e(n.entities);
	}
	for (let e of D) {
		let t = e.sortents;
		if (!t || !t.ents.length) continue;
		let n;
		if (t.blockOwner === P) n = _.entities;
		else if (t.blockOwner === F) n = _.paperSpace;
		else {
			let e = N.get(t.blockOwner)?.table?.name;
			n = e === void 0 ? void 0 : _.blocks[e]?.entities;
		}
		if (!n || n.length < 2) continue;
		let r = /* @__PURE__ */ new Map();
		for (let e = 0; e < t.ents.length; e++) r.set(t.ents[e], t.sorts[e]);
		let i = n.map((e, t) => {
			let n = e.handle ? parseInt(e.handle, 16) : NaN;
			return {
				e,
				i: t,
				k: r.get(n) ?? (Number.isFinite(n) ? n : t)
			};
		});
		i.sort((e, t) => e.k - t.k || e.i - t.i);
		for (let e = 0; e < i.length; e++) n[e] = i[e].e;
	}
	let me = (e) => {
		let t = e;
		for (let e = 0; e < 6 && t !== void 0; e++) {
			let e = N.get(t);
			if (e?.table?.name) return e.table.name;
			t = E.get(t)?.owner;
		}
	};
	for (let e of D) {
		if (!e.blockParam && !e.blockAction) continue;
		let t = _.blocks[me(e.owner) ?? ""];
		t && (t.isDynamic = !0, e.blockParam && (t.parameters ??= []).push(e.blockParam), e.blockAction && !(t.actions ?? []).includes(e.blockAction) && (t.actions ??= []).push(e.blockAction));
	}
	for (let e of D) {
		let t = e.visibility;
		if (!t) continue;
		let n = (e) => {
			let t = E.get(e)?.owner;
			return t === void 0 ? void 0 : N.get(t)?.table?.name;
		}, r;
		for (let e of t.members) if (r = n(e), r) break;
		let i = r ? _.blocks[r] : void 0;
		if (!i) continue;
		let a = (e) => e.toString(16).toUpperCase();
		i.isDynamic = !0, t.name && (i.visibilityName = t.name), t.prompt && (i.visibilityPrompt = t.prompt), t.states.length && (i.visibilityStates = t.states.map((e) => ({
			name: e.name,
			visible: e.visible.map(a)
		})));
	}
	if (p) {
		let e = Xe(p);
		if (e.length) {
			let t = D.filter((e) => e.hasDsData && e.entity?.type === "acis").map((e) => e.entity);
			t.forEach((t, n) => {
				e[n] && (t.sab = e[n]);
			}), t.length && e.length !== t.length && _.warnings.push(`${e.length} solid-modeling payloads for ${t.length} solids.`);
		}
	}
	let he = {
		has: (e) => !!E.get(e)?.entity,
		get: (e) => E.get(e)?.entity
	}, ge = (e) => e === void 0 ? void 0 : N.get(e)?.table?.name, L = /* @__PURE__ */ new Map();
	for (let e of D) e.dictionary && e.dictionary.handles.forEach((t, n) => {
		let r = e.dictionary.names[n];
		r && !L.has(t) && L.set(t, r);
	});
	for (let e of D) {
		let t = e.entity;
		if (t) {
			if (t.type === "mleader" && e.mleaderStyle) {
				let n = L.get(e.mleaderStyle);
				n && (t.styleName = n);
			} else if (t.type === "table" && e.tableStyle) {
				let n = L.get(e.tableStyle);
				n && (t.styleName = n);
			} else if (t.type === "mline" && e.mlineStyleHandle) {
				let n = L.get(e.mlineStyleHandle) ?? E.get(e.mlineStyleHandle)?.mlineStyle?.name;
				n && (t.styleName = n);
			}
		}
	}
	let _e = D.find((e) => e.typeName === "LinetypeTable")?.table?.ownedHandles ?? [], ve = (e) => {
		if (e === void 0 || e === 32767 || e < 0) return;
		if (e === 32766) return "ByBlock";
		let t = _e[e];
		return t === void 0 ? void 0 : O.get(t);
	}, ye = /* @__PURE__ */ new Map();
	for (let e of D) e.ucs && !ye.has(e.handle) && ye.set(e.handle, e.ucs.name);
	let be = /* @__PURE__ */ new Set(), xe = /* @__PURE__ */ new Map();
	{
		let e = [];
		v?.nodHandle && e.push(v.nodHandle);
		for (let t of D) t.dictionary && !t.owner && e.push(t.handle);
		let t = e.map((e) => [e, []]);
		for (; t.length;) {
			let [e, n] = t.pop();
			if (be.has(e)) continue;
			be.add(e), xe.set(e, n);
			let r = E.get(e)?.dictionary;
			r && r.handles.forEach((e, i) => {
				E.get(e)?.dictionary && !be.has(e) && t.push([e, [...n, r.names[i]]]);
			});
		}
	}
	let R = (e) => e.toString(16).toUpperCase();
	{
		let e = {};
		v?.nodHandle && (e.NOD = R(v.nodHandle));
		for (let [t, n] of xe) n.length === 1 && Jn.has(n[0].toUpperCase()) && !e[n[0].toUpperCase()] && (e[n[0].toUpperCase()] = R(t));
		let t = {
			BlockTable: "BLOCK_CONTROL",
			LayerTable: "LAYER_CONTROL",
			TextStyleTable: "STYLE_CONTROL",
			LinetypeTable: "LTYPE_CONTROL",
			ViewTable: "VIEW_CONTROL",
			UcsTable: "UCS_CONTROL",
			VPortTable: "VPORT_CONTROL",
			AppIdTable: "APPID_CONTROL",
			DimStyleTable: "DIMSTYLE_CONTROL",
			VxTable: "VX_CONTROL"
		};
		for (let n of D) {
			let r = t[n.typeName];
			r && !e[r] && (e[r] = R(n.handle));
		}
		P !== void 0 && (e.MODEL_SPACE = R(P)), F !== void 0 && (e.PAPER_SPACE = R(F)), Object.keys(e).length && (_.structureHandles = e);
	}
	let Se = (e, t) => !!E.get(e)?.dictionary?.handles.includes(t), Ce = (e) => {
		if (!e.dictionaryVar || e.owner === void 0) return !1;
		let t = xe.get(e.owner);
		return !!t && t.length === 1 && /^acdbvariabledictionary$/i.test(t[0]) && Se(e.owner, e.handle);
	};
	for (let e of D) {
		e.xrecord && e.xrecord.values.length && (_.xrecords ??= []).push({
			handle: e.handle.toString(16).toUpperCase(),
			name: L.get(e.handle),
			values: e.xrecord.values
		});
		let t = (e) => {
			for (let t of e ?? []) {
				if (!t.appHandle) continue;
				let e = k.get(parseInt(t.appHandle, 16));
				e && (t.appName = e, delete t.appHandle);
			}
		};
		if (e.proxyObject && (t(e.proxyObject.xdata), (_.proxyObjects ??= []).push({
			handle: e.handle.toString(16).toUpperCase(),
			name: L.get(e.handle),
			ownerHandle: e.owner?.toString(16).toUpperCase(),
			...e.xdict ? { xdict: R(e.xdict) } : {},
			...e.reactors?.length ? { reactors: e.reactors.map(R) } : {},
			...e.proxyObject
		})), e.unknownObject) {
			let n = e.dictionary ? xe.get(e.handle) : void 0;
			if (!(n?.length === 0 || n?.length === 1 && Jn.has(n[0].toUpperCase()) || e.xrecord && e.owner !== void 0 && xe.get(e.owner)?.length === 0 || Ce(e))) {
				t(e.unknownObject.xdata);
				let n = e.dictionary;
				(_.unknownObjects ??= []).push({
					handle: R(e.handle),
					name: L.get(e.handle),
					ownerHandle: e.owner?.toString(16).toUpperCase(),
					...e.xdict ? { xdict: R(e.xdict) } : {},
					...e.reactors?.length ? { reactors: e.reactors.map(R) } : {},
					...e.owner !== void 0 && xe.has(e.owner) && Se(e.owner, e.handle) ? { dictPath: xe.get(e.owner) } : {},
					...n ? {
						entries: n.names.map((e, t) => ({
							name: e,
							handle: R(n.handles[t]),
							code: n.codes[t]
						})),
						...n.hardOwner === void 0 ? {} : { hardOwner: n.hardOwner },
						...n.cloning === void 0 ? {} : { cloning: n.cloning },
						...n.defaultHandle === void 0 ? {} : { defaultHandle: R(n.defaultHandle) }
					} : {},
					...e.unknownObject
				});
			}
		}
		if (e.layout) {
			let t = e.layout;
			(_.layouts ??= []).push({
				name: t.name,
				tabOrder: t.tabOrder,
				blockName: ge(t.blockHandle),
				...t.blockHandle ? { blockHandle: t.blockHandle.toString(16).toUpperCase() } : {},
				limMin: t.limMin,
				limMax: t.limMax,
				extMin: t.extMin,
				extMax: t.extMax,
				insBase: t.insBase,
				paperSize: t.paperSize,
				plotStyleSheet: t.plotStyleSheet,
				handle: R(e.handle),
				...e.xdict ? { xdict: R(e.xdict) } : {}
			});
		}
		if (e.group && (_.groups ??= []).push({
			name: L.get(e.handle) ?? e.group.name,
			description: e.group.description,
			selectable: e.group.selectable,
			entityHandles: e.group.members.filter((e) => he.has(e)).map((e) => e.toString(16).toUpperCase()),
			handle: R(e.handle),
			...e.xdict ? { xdict: R(e.xdict) } : {}
		}), e.mlineStyle) {
			let t = e.mlineStyle;
			(_.mlineStyles ??= []).push({
				name: t.name,
				description: t.description,
				flags: t.flags,
				fillColor: t.fillColor,
				startAngle: t.startAngle,
				endAngle: t.endAngle,
				elements: t.elements.map((e) => ({
					offset: e.offset,
					color: e.color,
					linetype: e.ltypeHandle ? O.get(e.ltypeHandle) : ve(e.ltypeIndex)
				})),
				handle: R(e.handle),
				...e.xdict ? { xdict: R(e.xdict) } : {}
			});
		}
		if (e.tableStyleObj) {
			let n = e.tableStyleObj, r = (e) => {
				if (!e) return;
				let t = {
					textStyle: e.textStyleHandle ? j.get(e.textStyleHandle) : void 0,
					textHeight: e.textHeight,
					alignment: e.alignment,
					textColor: e.textColor,
					fillColor: e.fillColor,
					fillOn: e.fillOn,
					borders: e.borders?.map((e) => ({
						lineweight: e.lineweight,
						visible: e.visible,
						color: e.color
					}))
				};
				return e.dataType !== void 0 && (t.dataType = e.dataType), e.unitType !== void 0 && (t.unitType = e.unitType), e.format && (t.format = e.format), t;
			};
			t(e.xdata);
			let i = {
				name: L.get(e.handle) ?? n.description ?? "Standard",
				handle: e.handle.toString(16).toUpperCase(),
				description: n.description,
				flowDirection: n.flowDirection,
				flags: n.flags,
				horizontalMargin: n.horizontalMargin,
				verticalMargin: n.verticalMargin,
				titleSuppressed: n.titleSuppressed,
				headerSuppressed: n.headerSuppressed,
				data: r(n.data),
				title: r(n.title),
				header: r(n.header)
			};
			e.xdata && (i.xdata = e.xdata), e.xdict && (i.xdict = R(e.xdict)), (_.tableStyles ??= []).push(i);
		}
		if (e.mleaderStyleObj) {
			let { ltypeHandle: n, arrowHandle: r, textStyleHandle: i, blockHandle: a, ...o } = e.mleaderStyleObj;
			t(e.xdata);
			let s = {
				name: L.get(e.handle) ?? o.description ?? "Standard",
				handle: e.handle.toString(16).toUpperCase(),
				...o
			}, c = n ? O.get(n) : void 0;
			c && (s.linetype = c);
			let l = r ? ge(r) : void 0;
			l && (s.arrowBlock = l);
			let u = i ? j.get(i) : void 0;
			u && (s.textStyle = u);
			let d = a ? ge(a) : void 0;
			d && (s.blockName = d), e.xdata && (s.xdata = e.xdata), e.xdict && (s.xdict = R(e.xdict)), (_.mleaderStyles ??= []).push(s);
		}
		let n = (t) => ({
			...t,
			handle: R(e.handle),
			...e.xdict ? { xdict: R(e.xdict) } : {}
		});
		if (e.ucs) {
			let { baseUcsHandle: t, ...r } = e.ucs, i = t ? ye.get(t) : void 0;
			(_.ucs ??= []).push(n({
				...r,
				...i ? { baseUcs: i } : {}
			}));
		}
		e.dictionaryVar && Ce(e) && (_.variables ??= []).push(n({
			name: L.get(e.handle) ?? "",
			value: e.dictionaryVar.value,
			...e.dictionaryVar.schema ? { schema: e.dictionaryVar.schema } : {}
		})), e.view && (_.views ??= []).push(n(e.view)), e.vport && (_.vports ??= []).push(n(e.vport)), e.table?.kind === "appid" && e.table.name && (_.appIds ??= []).push(e.table.name), e.table?.kind === "dimstyle" && e.table.name && (_.dimStyles ??= []).push(n({ name: e.table.name }));
	}
	if (_.layouts && _.layouts.sort((e, t) => (e.tabOrder ?? 0) - (t.tabOrder ?? 0)), v) {
		let e = () => _.header.vars ??= {}, t = v.ucsNameHandle ? ye.get(v.ucsNameHandle) : void 0;
		t && (e().UCSNAME = t);
		let n = v.pUcsNameHandle ? ye.get(v.pUcsNameHandle) : void 0;
		n && (e().PUCSNAME = n);
		let r = v.cmlStyleHandle ? L.get(v.cmlStyleHandle) ?? E.get(v.cmlStyleHandle)?.mlineStyle?.name : void 0;
		r && (e().CMLSTYLE = r);
	}
	if (!_.header.summary) {
		let e = _.xrecords?.find((e) => e.name === "DWGPROPS");
		if (e) {
			let t = (t) => {
				let n = e.values.find((e) => e.code === t && "value" in e);
				return (n && "value" in n ? String(n.value) : "") || void 0;
			}, n = {
				title: t(2),
				subject: t(3),
				author: t(4),
				keywords: t(6),
				comments: t(7),
				lastSavedBy: t(8),
				revisionNumber: t(9)
			}, r = [], i = e.values.filter((e) => e.code >= 300 && e.code <= 309 && "value" in e);
			for (let e of i) {
				let t = "value" in e ? String(e.value) : "";
				t && t !== "=" && r.push({
					tag: t,
					value: ""
				});
			}
			(Object.values(n).some(Boolean) || r.length) && (_.header.summary = {
				...n,
				...r.length ? { custom: r } : {}
			});
		}
	}
	n.checkCrc && te && ne && _.warnings.push(`${ne} of ${te} object CRCs did not match (file may be damaged).`);
	for (let [e, t] of y) _.warnings.push(`${t} object${t === 1 ? "" : "s"} could not be decoded (${e}).`);
	let we = /* @__PURE__ */ new Map(), Te = (e) => {
		for (let t of e) t.type === "unknown" && !t.data && !t.graphicsData && we.set(t.sourceType, (we.get(t.sourceType) ?? 0) + 1);
	};
	Te(_.entities), _.paperSpace && Te(_.paperSpace);
	for (let [e, t] of we) _.warnings.push(`${t} ${e} entit${t === 1 ? "y" : "ies"} kept without geometry (not modeled yet).`);
	return _;
}, Xn = "ACIS BinaryFile", Zn = "ASM BinaryFile", Qn = {
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
}, $n = {
	1: "ignore",
	2: "copy",
	4: "keep_all"
}, er = {
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
}, tr = (e) => {
	if (Object.is(e, -0)) return "-0";
	if (Number.isInteger(e) && Math.abs(e) < 0x38d7ea4c68000) return String(e);
	let t = e.toPrecision(19);
	return t.includes("e") ? t = t.replace(/e([+-])(\d)$/, "e$10$2") : t.includes(".") && (t = t.replace(/0+$/, "").replace(/\.$/, "")), t;
}, nr = (e) => {
	let t = e.replace(/[^A-Za-z0-9+/]/g, ""), n = new Uint8Array(t.length * 3 >> 2), r = 0, i = 0, a = 0;
	for (let e of t) i = i << 6 | "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(e), a += 6, a >= 8 && (a -= 8, n[r++] = i >> a & 255);
	return n.subarray(0, r);
}, rr = (e) => {
	let t = typeof e == "string" ? nr(e) : e, n = new DataView(t.buffer, t.byteOffset, t.byteLength), r = (e) => {
		for (let n = 0; n < e.length; n++) if (t[n] !== e.charCodeAt(n)) return !1;
		return !0;
	};
	if (!r(Xn) && !r(Zn)) return null;
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
					v(tr(n.getFloat64(i, !0))), i += 8;
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
					let t = e === 10, n = h === "spline" && g === 0 ? ["reversed", "forward"] : Qn[p]?.[m];
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
					for (let e = 0; e < 3; e++) v(tr(n.getFloat64(i, !0))), i += 8;
					break;
				case 21: {
					let e = n.getInt32(i, !0);
					i += 4;
					let t = er[h]?.[_]?.[e];
					_++, v(t ?? $n[e] ?? String(e));
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
			l.map(tr).join(" ") + " "
		], b = r(Zn) ? "End-of-ASM-data " : "End-of-ACIS-data ";
		return y.join("\n") + "\n" + u.join("\n") + "\n" + b + "\n";
	} catch {
		return null;
	}
}, ir = (e, t, n) => {
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
}, Z = 180 / Math.PI, ar = (e) => {
	let t = (e * Z % 360 + 360) % 360;
	return Object.is(t, -0) ? 0 : t;
}, or = Math.PI / 180, Q = (e) => typeof e == "number" && isFinite(e), sr = [
	0,
	5,
	9,
	13,
	15,
	18,
	20,
	25,
	30,
	35,
	40,
	50,
	53,
	60,
	70,
	80,
	90,
	100,
	106,
	120,
	140,
	158,
	200,
	211
], cr = (e) => {
	if (e < 0) return e >= -3 ? Math.round(e) : -1;
	let t = e * 100, n = sr[0];
	for (let e of sr) Math.abs(e - t) < Math.abs(n - t) && (n = e);
	return n;
}, lr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", ur = (e) => {
	let t = e.replace(/[^A-Za-z0-9+/]/g, ""), n = new Uint8Array(t.length * 3 >> 2), r = 0, i = 0, a = 0;
	for (let e of t) i = i << 6 | lr.indexOf(e), a += 6, a >= 8 && (a -= 8, n[r++] = i >> a & 255);
	return n.subarray(0, r);
}, $ = (e) => {
	if (!isFinite(e)) return "0";
	if (Number.isInteger(e) && Math.abs(e) < 0x38d7ea4c68000) return String(e);
	let t = String(e);
	return (t.indexOf("e") !== -1 || t.indexOf("E") !== -1) && (t = e.toFixed(12).replace(/0+$/, ""), t.endsWith(".") && (t += "0")), t;
}, dr = (e) => /^\*(model_space|paper_space)/i.test(e), fr = {
	left: 0,
	center: 1,
	right: 2,
	aligned: 3,
	middle: 4,
	fit: 5
}, pr = {
	baseline: 0,
	bottom: 1,
	middle: 2,
	top: 3
}, mr = (e, t = {}) => {
	let r = t.preserveHandles === !0, i = (e) => e.trim().toUpperCase(), a = [], o = (e, t) => {
		let n = String(t);
		/[^\x00-\x7E]/.test(n) && (n = Ee(n)), a.push(String(e), n);
	}, s = 256, c = () => (s++).toString(16).toUpperCase(), l = e.blocks, u = Object.keys(l).filter((e) => l[e] && !dr(e) && !l[e].isLayout), d = Object.keys(l).filter((e) => l[e] && /^\*paper_space.+$/i.test(e)), f = () => {
		let t = [...e.entities, ...e.paperSpace ?? []];
		for (let e of u) t.push(...l[e].entities);
		for (let e of d) t.push(...l[e].entities);
		return t;
	}, p = /* @__PURE__ */ new Map(), m = /* @__PURE__ */ new Set();
	{
		let t = (e) => {
			e && /^\s*[0-9A-Fa-f]+\s*$/.test(e) && m.add(i(e));
		}, n = (e) => {
			for (let n of e ?? []) if (t(n.handle), n.type === "insert") for (let e of n.attributes ?? []) t(e.handle);
		};
		n(e.entities), n(e.paperSpace);
		for (let e of Object.values(l)) e && (t(e.handle), n(e.entities));
		for (let n of e.layouts ?? []) t(n.handle), t(n.blockHandle);
		let a = (e) => {
			t(e.handle), t(e.xdict);
		};
		for (let t of [
			...e.layers,
			...e.linetypes,
			...e.textStyles,
			...e.tableStyles ?? [],
			...e.mleaderStyles ?? [],
			...e.mlineStyles ?? [],
			...e.variables ?? [],
			...e.views ?? [],
			...e.vports ?? [],
			...e.dimStyles ?? [],
			...e.groups ?? [],
			...e.ucs ?? [],
			...e.layouts ?? []
		]) a(t);
		for (let n of Object.values(e.structureHandles ?? {})) t(n);
		for (let n of e.proxyObjects ?? []) t(n.handle);
		for (let n of e.unknownObjects ?? []) t(n.handle);
		for (let n of e.xrecords ?? []) t(n.handle);
		if (r) {
			let e = 0;
			for (let t of m) e = Math.max(e, parseInt(t, 16));
			Number.isFinite(e) && (s = Math.max(s, e + 1));
		}
	}
	let h = (e) => {
		let t = e ? i(e) : "";
		if (t && !p.has(t)) {
			let e = r && /^[0-9A-F]+$/.test(t) && parseInt(t, 16) > 0 ? t : c();
			return p.set(t, e), e;
		}
		return c();
	}, g = (e) => r && m.has(e) ? c() : e, _ = (e) => e ? p.get(i(e)) : void 0, v = f().filter((e) => e.type === "table"), y = /* @__PURE__ */ new Map(), b = /* @__PURE__ */ new Set();
	v.forEach((e, t) => {
		let n = e.blockName ?? "", r = /^\*T/i.test(n) && u.includes(n) ? l[n] : void 0;
		r && b.add(n), y.set(e, {
			name: "*T" + (t + 1),
			rec: r ? h(r.handle) : c(),
			src: r
		});
	});
	let x = [...y.values()], S = x.length > 0, C = f().some((e) => e.type === "mleader"), w = u.filter((e) => !b.has(e)), ee = new Set(w.filter((e) => l[e].xref).map((e) => e.toLowerCase())), T = (e) => {
		let t = e.indexOf("|");
		if (t <= 0) return;
		let n = e.slice(0, t).toLowerCase();
		return ee.has(n) ? n : void 0;
	}, E = (e) => !e.xrefDependent || T(e.name) !== void 0, D = e.layers.filter(E), te = D.length ? D : [{
		name: "0",
		color: {
			kind: "aci",
			index: 7
		},
		on: !0,
		frozen: !1,
		locked: !1
	}], ne = {};
	for (let e of w) ne[e] = e.replace(/^\*/, "ND_").replace(/[<>\/\\":;?*|=`,]/g, "_");
	let re = (e) => ne[e] ?? e, O = e.layouts ?? [], k = O.find((e) => e.blockName ? /^\*model_space$/i.test(e.blockName) : /model/i.test(e.name))?.blockHandle, A = O.find((e) => e.blockName ? /^\*paper_space$/i.test(e.blockName) : !/model/i.test(e.name))?.blockHandle, j = r && k ? h(k) : g("1F"), M = r && A ? h(A) : g("1B");
	r || (k && p.set(i(k), j), A && p.set(i(A), M));
	let N = g("E"), P = g("F"), F = {};
	for (let e of w) F[e] = h(l[e].handle);
	for (let e of d) F[e] = h(l[e].handle);
	let ie = /* @__PURE__ */ new Map(), ae = (e, t, n) => {
		let r = e + "|" + t + "x" + n, i = ie.get(r);
		return i || ie.set(r, i = {
			handle: c(),
			w: t,
			h: n
		}), i.handle;
	}, oe = () => {
		let t = [...e.entities, ...e.paperSpace ?? []];
		for (let e of w) t.push(...l[e].entities);
		return t;
	}, se = oe().some((e) => e.type === "image"), I = e.mlineStyles?.length ? e.mlineStyles : oe().some((e) => e.type === "mline") ? [{
		name: "Standard",
		elements: [{
			offset: .5,
			color: { kind: "byLayer" }
		}, {
			offset: -.5,
			color: { kind: "byLayer" }
		}]
	}] : [], ce = I.map((e) => h(e.handle)), le = /* @__PURE__ */ new Map();
	I.forEach((e, t) => le.set(e.name.toLowerCase(), t));
	let de = /* @__PURE__ */ new Map(), fe = /* @__PURE__ */ new Map(), pe = (e, t) => {
		let n = /* @__PURE__ */ new Set();
		return (e?.some((e) => /^standard$/i.test(e.name)) ? [...e] : [t, ...e ?? []]).filter((e) => !n.has(e.name.toLowerCase()) && !!n.add(e.name.toLowerCase()));
	}, me = S || !!e.tableStyles?.length, he = C || !!e.mleaderStyles?.length, L = me ? pe(e.tableStyles, { name: "Standard" }) : [], ve = he ? pe(e.mleaderStyles, { name: "Standard" }) : [], ye = me ? c() : "", be = L.map((e) => h(e.handle)), xe = he ? c() : "", R = ve.map((e) => h(e.handle)), Se = (e, t, n) => {
		let r = (n ?? "").toLowerCase(), i = e.findIndex((e) => e.name.toLowerCase() === r);
		return i < 0 && (i = e.findIndex((e) => /^standard$/i.test(e.name))), t[i] ?? "0";
	}, Ce = (e) => Se(L, be, e), we = (e) => Se(ve, R, e), De = [...new Set(oe().filter((e) => e.type === "underlay").map((e) => e.underlayKind))].sort(), Oe = /* @__PURE__ */ new Map(), ke = (e, t, n) => {
		let r = e + "|" + t + "|" + n, i = Oe.get(r);
		return i || Oe.set(r, i = {
			handle: c(),
			kind: e,
			path: t,
			itemName: n
		}), i.handle;
	}, Ae = (e) => e.type === "proxy" && !!(e.data || e.graphicsData), je = e.proxyObjects ?? [], Me = /* @__PURE__ */ new Set(["TABLECONTENT", "DATALINK"]), Ne = [
		"R2004",
		"R2007",
		"R2010",
		"R2013",
		"R2018"
	].includes(e.header.version ?? ""), Pe = (e) => e.startsWith("ACDBASSOC") || e.startsWith("ASSOC") || /DEPENDENCYBODY$/.test(e), Fe = (e) => {
		let t = e.sourceType.toUpperCase();
		return Me.has(t) ? Ne || !!e.tags?.some(([e, t]) => e === 304 && t.trim().toUpperCase() === "ACVALUE_END") : Ne && Pe(t);
	}, Ie = (e) => (e.appClass?.dxfName ?? e.sourceType ?? "").toUpperCase(), Le = (e) => {
		let t = Ie(e);
		return t === "DICTIONARY" || t === "ACDBDICTIONARYWDFLT";
	}, Re = (e) => Le(e) && e.entries !== void 0, ze = (e) => Ie(e) === "XRECORD", Be = (e) => !!e.tags && e.tags.length > 0, Ve = /* @__PURE__ */ new Map();
	for (let t of e.xrecords ?? []) t.handle && Ve.set(i(t.handle), t);
	let He = (e) => ze(e) && e.handle ? Ve.get(i(e.handle)) : void 0, Ue = {
		R13: 19,
		R14: 21,
		R2000: 23,
		R2004: 25,
		R2007: 27,
		R2010: 29,
		R2013: 31,
		R2018: 33
	}, We = {
		R13: 14,
		R14: 14,
		R2000: 2e3,
		R2004: 2004,
		R2007: 2007,
		R2010: 2018,
		R2013: 2018,
		R2018: 2018
	}, Ge = (e) => !!e.data && !!e.dataBits && e.encoding !== void 0 && !!e.appClass?.dxfName && !Le(e) && !ze(e), Ke = (t) => {
		let n = e.header.version ?? "";
		return t.encoding === We[n] ? Ue[n] : Ue[{
			14: "R14",
			2e3: "R2000",
			2004: "R2004",
			2007: "R2007",
			2018: "R2018"
		}[t.encoding ?? 2018] ?? "R2018"];
	}, qe = (e) => Be(e) || Re(e) || He(e) !== void 0 || Ge(e), Je = e.unknownObjects ?? [], Ye = /* @__PURE__ */ new Map();
	for (let e of Je) e.handle && Ye.set(i(e.handle), e);
	let Xe = /* @__PURE__ */ new Set([
		"ACAD_PLOTSTYLENAME",
		"ACAD_GROUP",
		"ACAD_LAYOUT",
		"ACAD_MLINESTYLE",
		"ACAD_TABLESTYLE",
		"ACAD_MLEADERSTYLE",
		"ACAD_IMAGE_DICT",
		"ACAD_PDFDEFINITIONS",
		"ACAD_DGNDEFINITIONS",
		"ACAD_DWFDEFINITIONS",
		"ACAD_GEOGRAPHICDATA",
		"ACDB_RECOMPOSE_DATA",
		"ACDBVARIABLEDICTIONARY"
	]), Ze = Je.find((e) => e.dictPath?.length === 0 && e.ownerHandle)?.ownerHandle ?? e.structureHandles?.NOD, B = g("C");
	Ze && p.set(i(Ze), B);
	let V = [], $e = (e) => V.some((t) => t.name.toLowerCase() === e.toLowerCase());
	for (let t of e.variables ?? []) t.name && !$e(t.name) && V.push(t);
	let H = /* @__PURE__ */ new Set();
	for (let e of Je) {
		if (Ie(e) !== "DICTIONARYVAR" || !e.name || !e.tags?.length || e.dictPath?.length !== 1 || i(e.dictPath[0]) !== "ACDBVARIABLEDICTIONARY") continue;
		let t = e.tags.find((e) => e[0] === 1)?.[1];
		if (t === void 0 || (H.add(e), $e(e.name))) continue;
		let n = Number(e.tags.find((e) => e[0] === 280)?.[1] ?? 0);
		V.push({
			name: e.name,
			value: t,
			...n ? { schema: n } : {},
			...e.handle ? { handle: e.handle } : {},
			...e.xdict ? { xdict: e.xdict } : {}
		});
	}
	let et = V.map((e) => h(e.handle)), tt = e.structureHandles?.ACDBVARIABLEDICTIONARY, nt = V.length ? h(tt) : "", rt = /* @__PURE__ */ new WeakMap(), it = (e) => {
		if (rt.has(e)) return rt.get(e) ?? null;
		let t = e.sat ?? (e.sab ? rr(e.sab) : null);
		return rt.set(e, t), t;
	}, at = (e) => {
		switch (e.type) {
			case "polyline": return e.vertices.length >= 2;
			case "spline": return e.controlPoints.length >= 2 || (e.fitPoints?.length ?? 0) >= 2;
			case "hatch": return e.loops.length > 0;
			case "mline": return e.vertices.length >= 2;
			case "mesh": return e.vertices.length > 0;
			case "insert": return !!e.blockName;
			case "leader": return e.vertices.length >= 2;
			case "acis": {
				let t = it(e);
				if (!t) return !1;
				let n = parseInt(t, 10);
				return !(isFinite(n) && n >= 21800);
			}
			case "unknown": return !!e.tags?.length;
			case "proxy": return !!(e.data || e.graphicsData);
			default: return !0;
		}
	}, ot = /* @__PURE__ */ new WeakMap(), st = (e) => {
		if (at(e) && (ot.set(e, h(e.handle)), e.type === "insert")) for (let t of e.attributes ?? []) ot.set(t, h(t.handle));
	}, ct = [];
	for (let e of d) ct.push({
		block: F[e],
		src: l[e].handle,
		list: l[e].entities
	});
	for (let e of w) l[e].xref || ct.push({
		block: F[e],
		src: l[e].handle,
		list: l[e].entities
	});
	for (let e of x) e.src && ct.push({
		block: e.rec,
		src: e.src.handle,
		list: e.src.entities
	});
	ct.push({
		block: j,
		src: k,
		list: e.entities
	}), ct.push({
		block: M,
		src: A,
		list: e.paperSpace ?? []
	});
	for (let e of ct) e.list.forEach(st);
	let lt = /* @__PURE__ */ new Map();
	for (let e of O) lt.set(e, h(e.handle));
	let ut = /* @__PURE__ */ new Map(), dt = e.textStyles.filter(E).filter((e, t, n) => !(e.shapeFile && n.some((t) => t !== e && !t.shapeFile && t.name.toLowerCase() === e.name.toLowerCase()))).filter((e) => !(e.shapeFile && e.name.includes("|") && !e.xrefDependent)), ft = dt.length ? dt : [{ name: "Standard" }];
	for (let t of [
		...te,
		...e.linetypes.filter(E),
		...ft
	]) ut.set(t, h(t.handle));
	let pt = je.map((e) => h(e.handle)), mt = [], ht = /* @__PURE__ */ new Map();
	if (r) for (let e of ct) {
		let t = e.list.map((e) => ot.get(e)).filter((e) => !!e), n = t.map((e) => parseInt(e, 16));
		if (!n.some((e, t) => t > 0 && e < n[t - 1])) continue;
		let r = [...n].sort((e, t) => e - t), a = [];
		t.forEach((e, t) => {
			let n = r[t].toString(16).toUpperCase();
			n !== e && a.push([e, n]);
		});
		let o = e.src ? Je.find((t) => Re(t) && !!t.ownerHandle && i(t.ownerHandle) === i(e.src)) : void 0, s = c();
		o?.handle && ht.set(i(o.handle), [[
			"ACAD_SORTENTS",
			s,
			3
		]]), mt.push({
			block: e.block,
			src: e.src,
			dict: o ? "" : c(),
			sealedDict: o,
			table: s,
			pairs: a
		});
	}
	let gt = /* @__PURE__ */ new Map(), _t = /* @__PURE__ */ new Set(), vt = /* @__PURE__ */ new Set();
	for (let e of Je) {
		let t = Ie(e) || "sealed object";
		if (H.has(e)) {
			gt.set(e, `${t} (written natively as a drawing variable)`), _t.add(e);
			continue;
		}
		if (t === "ACDBPLACEHOLDER") {
			gt.set(e, `${t} (this writer builds its own)`), _t.add(e);
			continue;
		}
		if (!qe(e)) {
			gt.set(e, `${t} (sealed as DWG bits, no DXF spelling)`);
			continue;
		}
		if (Be(e) && Fe(e)) {
			gt.set(e, `${t} (its post-R2000 spelling has no place in an AC1015 file)`);
			continue;
		}
		if (Le(e) && e.dictPath?.length === 0 && e.name && Xe.has(i(e.name))) {
			gt.set(e, `${t} ${e.name} (this writer builds its own)`), _t.add(e);
			continue;
		}
		vt.add(e);
	}
	let yt = (e) => {
		let t = i(e), n = Ye.get(t);
		return n ? vt.has(n) : p.has(t);
	}, bt = (e) => e.map(i).join(" "), xt = (e) => {
		if (ze(e) || Re(e)) return !0;
		if (!e.tags) return !(e.refs ?? []).some((e) => (e.code === 3 || e.code === 5) && !!e.value && i(e.value) !== "0" && !yt(e.value));
		let t = !1;
		for (let [n, r] of e.tags) {
			if (n === 100) {
				t = !0;
				continue;
			}
			if (t && (n >= 340 && n <= 349 || n >= 360 && n <= 369) && r.trim() && i(r) !== "0" && !yt(r)) return !1;
		}
		return !0;
	}, St = (e, t, n) => {
		vt.delete(e), gt.set(e, t), n && _t.add(e);
	};
	for (let e = !0; e;) {
		e = !1;
		let t = /* @__PURE__ */ new Set();
		for (let e of vt) e.dictPath !== void 0 && t.add(bt(e.dictPath));
		for (let n of [...vt]) {
			let r = Ie(n) || "sealed object", a = n.ownerHandle ? i(n.ownerHandle) : "", o = a ? Ye.get(a) : void 0, s = !!a && yt(a), c = null, l = !1;
			o && !vt.has(o) && !(Le(o) && o.dictPath !== void 0) ? (c = `${r} (its owner stays home)`, l = !0) : Re(n) ? (n.entries ?? []).some((e) => yt(e.handle)) || n.handle !== void 0 && ht.has(i(n.handle)) || n.dictPath !== void 0 && n.name !== void 0 && t.has(bt([...n.dictPath, n.name])) ? !s && n.dictPath === void 0 && (c = `${r} (extension dictionary of an object not written)`) : (c = `${r} (nothing it lists is written)`, l = !0) : !s && n.dictPath === void 0 ? c = `${r} (its owner is not written)` : xt(n) || (c = `${r} (a hard reference into an object not written)`), c !== null && (St(n, c, l), e = !0);
		}
	}
	let Ct = Je.filter((e) => vt.has(e)), wt = Ct.map((e) => h(e.handle)), Tt = /* @__PURE__ */ new Map();
	Ct.forEach((e, t) => Tt.set(e, wt[t]));
	for (let e of mt) {
		let t = e.sealedDict ? Tt.get(e.sealedDict) : void 0;
		t ? e.dict = t : (e.sealedDict = void 0, e.dict ||= c());
	}
	let Et = /* @__PURE__ */ new Map();
	for (let e of mt) Et.set(e.block, e);
	let Dt = /* @__PURE__ */ new Map();
	for (let e of Ct) {
		if (!Le(e) || !e.ownerHandle) continue;
		let t = Ye.get(i(e.ownerHandle));
		t && Le(t) && (t.entries ?? []).some((t) => !!e.handle && i(t.handle) === i(e.handle)) || Dt.set(i(e.ownerHandle), e);
	}
	let Ot = (e) => {
		let t = l[e]?.handle, n = t ? Dt.get(i(t)) : void 0;
		if (!n) return !1;
		let r = (n.entries ?? []).find((e) => i(e.name) === "ACAD_ENHANCEDBLOCK"), a = r ? Ye.get(i(r.handle)) : void 0;
		return !!a && vt.has(a) && Ie(a) === "ACAD_EVALUATION_GRAPH";
	};
	{
		let t = /* @__PURE__ */ new Map();
		for (let [e, n] of gt) _t.has(e) || t.set(n, (t.get(n) ?? 0) + 1);
		for (let [n, r] of t) e.warnings.push(`${r} ${n} left out of the DXF`);
	}
	let kt = /* @__PURE__ */ new Map(), At = /* @__PURE__ */ new Map(), jt = /* @__PURE__ */ new Set(), Mt = /* @__PURE__ */ new Set();
	for (let e of ct) for (let t of e.list) {
		if (t.type !== "hatch") continue;
		let e = ot.get(t);
		if (!e || (jt.add(e), !t.associative)) continue;
		let n = t.loops.map((e) => (e.boundaryHandles ?? []).map((e) => _(e)).filter((e) => !!e));
		if (n.some((e) => e.length)) {
			kt.set(t, n), Mt.add(e);
			for (let t of n) for (let n of t) {
				let t = At.get(n) ?? [];
				t.includes(e) || t.push(e), At.set(n, t);
			}
		}
	}
	let Nt = (e, t) => {
		let n = [], r = (e) => {
			e && e !== t && !n.includes(e) && n.push(e);
		};
		for (let t of e ?? []) {
			let e = _(t);
			e && jt.has(e) && !Mt.has(e) || r(e);
		}
		for (let e of At.get(t) ?? []) r(e);
		return n;
	}, Pt = (e, t, n, r) => {
		let a = e ? Dt.get(i(e)) : void 0, s = r ?? (a ? Tt.get(a) : void 0);
		s && (o(102, "{ACAD_XDICTIONARY"), o(360, s), o(102, "}"));
		let c = Nt(t, n);
		if (c.length) {
			o(102, "{ACAD_REACTORS");
			for (let e of c) o(330, e);
			o(102, "}");
		}
	}, Ft = /* @__PURE__ */ new Map(), It = (e, t, n) => e?.dxfName ?? t ?? n, Lt = (e, t, n, r) => {
		let i = It(e, t, n), a = Ft.get(i);
		if (a) {
			r && (a.ent = !0);
			return;
		}
		Ft.set(i, {
			cpp: e?.cppName ?? i,
			app: e?.appName ?? "ObjectDBX Classes",
			ent: r
		});
	};
	for (let e of oe()) Ae(e) && Lt(e.appClass, e.sourceType, "ACAD_PROXY_ENTITY", !0);
	for (let e of je) Lt(e.appClass, e.sourceType, "ACAD_PROXY_OBJECT", !1);
	let Rt = [], zt = /* @__PURE__ */ new Map(), Bt = (e) => {
		let t = i(e.dxf);
		t && !zt.has(t) && (zt.set(t, 500 + Rt.length), Rt.push(e));
	}, Vt = (e) => zt.get(i(e)) ?? 0;
	Bt({
		dxf: "ACDBDICTIONARYWDFLT",
		cpp: "AcDbDictionaryWithDefault",
		app: "ObjectDBX Classes",
		flags: 0,
		wasProxy: !1,
		ent: !1
	}), Bt({
		dxf: "ACDBPLACEHOLDER",
		cpp: "AcDbPlaceholder",
		app: "ObjectDBX Classes",
		flags: 0,
		wasProxy: !1,
		ent: !1
	});
	let Ht = (e, t, n) => Bt({
		dxf: e,
		cpp: t,
		app: "ISM",
		flags: 127,
		wasProxy: !1,
		ent: n
	});
	se && (Ht("IMAGE", "AcDbRasterImage", !0), Ht("WIPEOUT", "AcDbWipeout", !0), Ht("IMAGEDEF", "AcDbRasterImageDef", !1), Ht("RASTERVARIABLES", "AcDbRasterVariables", !1));
	for (let e of De) {
		let t = e.charAt(0).toUpperCase() + e.slice(1);
		Ht(e.toUpperCase() + "UNDERLAY", `AcDb${t}Reference`, !0), Ht(e.toUpperCase() + "DEFINITION", `AcDb${t}Definition`, !1);
	}
	S && Bt({
		dxf: "ACAD_TABLE",
		cpp: "AcDbTable",
		app: "ObjectDBX Classes",
		flags: 1025,
		wasProxy: !1,
		ent: !0
	}), me && Bt({
		dxf: "TABLESTYLE",
		cpp: "AcDbTableStyle",
		app: "ObjectDBX Classes",
		flags: 4095,
		wasProxy: !1,
		ent: !1
	}), C && Bt({
		dxf: "MULTILEADER",
		cpp: "AcDbMLeader",
		app: "ACDB_MLEADER_CLASS",
		flags: 1025,
		wasProxy: !1,
		ent: !0
	}), he && Bt({
		dxf: "MLEADERSTYLE",
		cpp: "AcDbMLeaderStyle",
		app: "ACDB_MLEADERSTYLE_CLASS",
		flags: 4095,
		wasProxy: !1,
		ent: !1
	});
	for (let [e, t] of Ft) Bt({
		dxf: e,
		cpp: t.cpp,
		app: t.app,
		flags: t.ent ? 4095 : 0,
		wasProxy: !0,
		ent: t.ent
	});
	for (let e of Ct) e.appClass && Bt({
		dxf: e.appClass.dxfName,
		cpp: e.appClass.cppName || e.appClass.dxfName,
		app: e.appClass.appName || "ObjectDBX Classes",
		flags: 0,
		wasProxy: !1,
		ent: !1
	});
	for (let e of oe()) e.type === "unknown" && e.tags?.length && e.appClass && Bt({
		dxf: e.appClass.dxfName,
		cpp: e.appClass.cppName || e.appClass.dxfName,
		app: e.appClass.appName || "ObjectDBX Classes",
		flags: 4095,
		wasProxy: !1,
		ent: !0
	});
	mt.length && Bt({
		dxf: "SORTENTSTABLE",
		cpp: "AcDbSortentsTable",
		app: "ObjectDBX Classes",
		flags: 0,
		wasProxy: !1,
		ent: !1
	}), V.length && Bt({
		dxf: "DICTIONARYVAR",
		cpp: "AcDbDictionaryVar",
		app: "ObjectDBX Classes",
		flags: 0,
		wasProxy: !1,
		ent: !1
	});
	let Ut = /* @__PURE__ */ new Map();
	for (let e of Ft.keys()) Ut.set(e, Vt(e));
	let U = {
		minx: Infinity,
		miny: Infinity,
		maxx: -Infinity,
		maxy: -Infinity
	}, W = (e, t) => {
		Q(e) && Q(t) && (e < U.minx && (U.minx = e), e > U.maxx && (U.maxx = e), t < U.miny && (U.miny = t), t > U.maxy && (U.maxy = t));
	}, Wt = (e) => {
		if (e.kind === "polyline") for (let t of e.vertices) W(t.x, t.y);
		else if (e.kind === "circle") W(e.center.x - e.radius, e.center.y - e.radius), W(e.center.x + e.radius, e.center.y + e.radius);
		else if (e.kind === "ellipse") {
			let t = Math.hypot(e.majorAxis.x, e.majorAxis.y);
			W(e.center.x - t, e.center.y - t), W(e.center.x + t, e.center.y + t);
		} else for (let t of e.edges) if (t.kind === "line") W(t.start.x, t.start.y), W(t.end.x, t.end.y);
		else if (t.kind === "arc") W(t.center.x - t.radius, t.center.y - t.radius), W(t.center.x + t.radius, t.center.y + t.radius);
		else if (t.kind === "ellipticalArc") {
			let e = Math.hypot(t.majorAxis.x, t.majorAxis.y);
			W(t.center.x - e, t.center.y - e), W(t.center.x + e, t.center.y + e);
		} else for (let e of t.controlPoints) W(e.x, e.y);
	}, Gt = (e) => {
		switch (e.type) {
			case "line":
				W(e.start.x, e.start.y), W(e.end.x, e.end.y);
				break;
			case "point":
				W(e.position.x, e.position.y);
				break;
			case "polyline":
				for (let t of e.vertices) W(t.x, t.y);
				break;
			case "circle":
			case "arc":
				W(e.center.x - e.radius, e.center.y - e.radius), W(e.center.x + e.radius, e.center.y + e.radius);
				break;
			case "ellipse": {
				let t = Math.hypot(e.majorAxis.x, e.majorAxis.y);
				W(e.center.x - t, e.center.y - t), W(e.center.x + t, e.center.y + t);
				break;
			}
			case "spline":
				for (let t of e.controlPoints) W(t.x, t.y);
				for (let t of e.fitPoints ?? []) W(t.x, t.y);
				break;
			case "text":
			case "mtext": {
				let t = Q(e.height) && e.height > 0 ? e.height : 5, n = e.text.length * t * .8;
				W(e.position.x, e.position.y - t), W(e.position.x + n, e.position.y + t);
				break;
			}
			case "insert":
				W(e.position.x, e.position.y);
				break;
			case "hatch":
				for (let t of e.loops) Wt(t);
				break;
			case "solid":
				for (let t of e.corners) W(t.x, t.y);
				break;
			case "leader":
				for (let t of e.vertices) W(t.x, t.y);
				break;
			case "dimension":
				W(e.definitionPoint.x, e.definitionPoint.y), e.textMidpoint && W(e.textMidpoint.x, e.textMidpoint.y);
				break;
			case "face3d":
				for (let t of e.corners) W(t.x, t.y);
				break;
			case "shape":
				W(e.position.x, e.position.y);
				break;
			case "tolerance":
				W(e.position.x, e.position.y);
				break;
			case "mline":
				for (let t of e.vertices) W(t.position.x, t.position.y);
				break;
			case "mesh":
				for (let t of e.vertices) W(t.x, t.y);
				break;
			case "image": {
				let t = e.position.x, n = e.position.y, r = t + e.uVector.x * e.widthPx + e.vVector.x * e.heightPx, i = n + e.uVector.y * e.widthPx + e.vVector.y * e.heightPx;
				W(t, n), W(r, i);
				break;
			}
			case "table": {
				let t = e.columnWidths.reduce((e, t) => e + (Q(t) ? t : 0), 0), n = e.rowHeights.reduce((e, t) => e + (Q(t) ? t : 0), 0);
				W(e.position.x, e.position.y - n), W(e.position.x + t, e.position.y);
				break;
			}
			case "mleader":
				for (let t of e.leaders) {
					for (let e of t.lines) for (let t of e) W(t.x, t.y);
					t.landing && W(t.landing.x, t.landing.y);
				}
				e.textPosition && W(e.textPosition.x, e.textPosition.y), e.blockPosition && W(e.blockPosition.x, e.blockPosition.y);
		}
	};
	for (let t of e.entities) Gt(t);
	let G = e.header, Kt = (e, t, n = !0) => !e || !t || ![
		e.x,
		e.y,
		t.x,
		t.y
	].every((e) => Q(e) && Math.abs(e) < 0x8ac7230489e80000) || n && (t.x < e.x || t.y < e.y) ? null : {
		min: {
			x: e.x,
			y: e.y
		},
		max: {
			x: t.x,
			y: t.y
		}
	}, qt = Kt(G.extMin, G.extMax), Jt = !!qt || U.maxx >= U.minx && U.maxy >= U.miny, Yt = qt?.min ?? (Jt ? {
		x: U.minx,
		y: U.miny
	} : {
		x: 0x56bc75e2d63100000,
		y: 0x56bc75e2d63100000
	}), Xt = qt?.max ?? (Jt ? {
		x: U.maxx,
		y: U.maxy
	} : {
		x: -0x56bc75e2d63100000,
		y: -0x56bc75e2d63100000
	}), Zt = Jt ? Math.max(Xt.x - Yt.x, 1e-6) : 100, Qt = Jt ? Math.max(Xt.y - Yt.y, 1e-6) : 100, $t = Jt ? (Yt.x + Xt.x) / 2 : 0, en = Jt ? (Yt.y + Xt.y) / 2 : 0, tn = 1.6, nn = Math.max(Qt, Zt / tn) * 1.06, rn = (e.vports ?? []).find((e) => /^\*active$/i.test(e.name));
	o(0, "SECTION"), o(2, "HEADER"), o(9, "$ACADVER"), o(1, "AC1015"), o(9, "$DWGCODEPAGE"), o(3, G.codepage ?? "ANSI_1252"), o(9, "$INSUNITS"), o(70, G.insUnits ?? 4), Q(G.linetypeScale) && G.linetypeScale > 0 && (o(9, "$LTSCALE"), o(40, $(G.linetypeScale)));
	for (let e of [
		"DIMSCALE",
		"DIMASZ",
		"DIMEXO",
		"DIMDLI",
		"DIMEXE",
		"DIMRND",
		"DIMDLE",
		"DIMTP",
		"DIMTM",
		"DIMTXT",
		"DIMCEN",
		"DIMTSZ",
		"DIMALTF",
		"DIMLFAC",
		"DIMTVP",
		"DIMTFAC",
		"DIMGAP"
	]) {
		let t = G.vars?.[e];
		Q(t) && (o(9, "$" + e), o(40, $(t)));
	}
	Q(G.vars?.DIMDEC) && (o(9, "$DIMDEC"), o(70, G.vars.DIMDEC)), Q(G.vars?.PDMODE) && (o(9, "$PDMODE"), o(70, G.vars.PDMODE)), Q(G.vars?.PDSIZE) && (o(9, "$PDSIZE"), o(40, $(G.vars.PDSIZE)));
	for (let [e, t] of Object.entries(G.vars ?? {})) {
		if (!Array.isArray(t)) continue;
		let n = t;
		if (n.every((e) => Array.isArray(e) && e.length === 2 && Q(e[0])) && !n.some((e) => {
			let t = e[0];
			return t === 5 || t === 105 || t >= 320 && t <= 369;
		})) {
			o(9, e);
			for (let e of n) o(e[0], e[1]);
		}
	}
	o(9, "$EXTMIN"), o(10, $(Yt.x)), o(20, $(Yt.y)), o(30, 0), o(9, "$EXTMAX"), o(10, $(Xt.x)), o(20, $(Xt.y)), o(30, 0);
	let an = Kt(G.limMin && {
		...G.limMin,
		z: 0
	}, G.limMax && {
		...G.limMax,
		z: 0
	}, !1);
	o(9, "$LIMMIN"), o(10, $(an ? an.min.x : Jt ? Yt.x : 0)), o(20, $(an ? an.min.y : Jt ? Yt.y : 0)), o(9, "$LIMMAX"), o(10, $(an ? an.max.x : Jt ? Xt.x : 100)), o(20, $(an ? an.max.y : Jt ? Xt.y : 100)), o(9, "$LIMCHECK"), o(70, 0), o(9, "$VIEWCTR"), o(10, $(rn ? rn.center.x : $t)), o(20, $(rn ? rn.center.y : en)), o(9, "$VIEWSIZE"), o(40, $(rn && Q(rn.height) && rn.height > 0 ? rn.height : nn)), G.ucs && (o(9, "$UCSORG"), o(10, $(G.ucs.origin.x)), o(20, $(G.ucs.origin.y)), o(30, $(G.ucs.origin.z)), o(9, "$UCSXDIR"), o(10, $(G.ucs.xAxis.x)), o(20, $(G.ucs.xAxis.y)), o(30, $(G.ucs.xAxis.z)), o(9, "$UCSYDIR"), o(10, $(G.ucs.yAxis.x)), o(20, $(G.ucs.yAxis.y)), o(30, $(G.ucs.yAxis.z))), G.pUcs && (o(9, "$PUCSORG"), o(10, $(G.pUcs.origin.x)), o(20, $(G.pUcs.origin.y)), o(30, $(G.pUcs.origin.z)), o(9, "$PUCSXDIR"), o(10, $(G.pUcs.xAxis.x)), o(20, $(G.pUcs.xAxis.y)), o(30, $(G.pUcs.xAxis.z)), o(9, "$PUCSYDIR"), o(10, $(G.pUcs.yAxis.x)), o(20, $(G.pUcs.yAxis.y)), o(30, $(G.pUcs.yAxis.z))), o(9, "$HANDSEED");
	let K = a.length + 1;
	o(5, "FFFF"), o(0, "ENDSEC"), o(0, "SECTION"), o(2, "CLASSES");
	for (let e of Rt) o(0, "CLASS"), o(1, e.dxf), o(2, e.cpp), o(3, e.app), o(90, e.flags), o(280, +!!e.wasProxy), o(281, +!!e.ent);
	o(0, "ENDSEC"), o(0, "SECTION"), o(2, "TABLES"), o(0, "TABLE"), o(2, "VPORT"), o(5, c()), o(100, "AcDbSymbolTable"), o(70, 1), o(0, "VPORT"), o(5, c()), o(100, "AcDbSymbolTableRecord"), o(100, "AcDbViewportTableRecord"), o(2, "*Active"), o(70, 0);
	let q = rn;
	if (q) {
		o(10, $(q.lowerLeft.x)), o(20, $(q.lowerLeft.y)), o(11, $(q.upperRight.x)), o(21, $(q.upperRight.y)), o(12, $(q.center.x)), o(22, $(q.center.y)), o(13, $(q.snapBase?.x ?? 0)), o(23, $(q.snapBase?.y ?? 0)), o(14, $(q.snapSpacing?.x ?? 10)), o(24, $(q.snapSpacing?.y ?? 10)), o(15, $(q.gridSpacing?.x ?? 10)), o(25, $(q.gridSpacing?.y ?? 10));
		let e = q.direction ?? {
			x: 0,
			y: 0,
			z: 1
		}, t = q.target ?? {
			x: 0,
			y: 0,
			z: 0
		};
		o(16, $(e.x)), o(26, $(e.y)), o(36, $(e.z)), o(17, $(t.x)), o(27, $(t.y)), o(37, $(t.z)), o(40, $(q.height)), o(41, $(q.aspectRatio && q.aspectRatio > 0 ? q.aspectRatio : tn)), o(42, $(q.lensLength ?? 50)), o(43, $(q.frontClip ?? 0)), o(44, $(q.backClip ?? 0)), o(50, $(ar(q.snapAngle ?? 0))), o(51, $(ar(q.twist ?? 0))), o(71, (q.viewMode ?? 0) | (q.ucsFollow ? 8 : 0)), o(72, q.circleSides ?? 100), o(73, q.fastZoom === !1 ? 0 : 1), o(74, q.ucsIcon ?? 3), o(75, +!!q.snapOn), o(76, +!!q.gridOn), o(77, q.snapStyle ?? 0), o(78, q.snapIsoPair ?? 0), q.renderMode !== void 0 && o(281, q.renderMode), q.ucsPerViewport !== void 0 && o(65, +!!q.ucsPerViewport);
		let n = q.ucsOrigin ? {
			origin: q.ucsOrigin,
			xAxis: q.ucsXAxis,
			yAxis: q.ucsYAxis
		} : G.ucs;
		n?.xAxis && n.yAxis && (o(110, $(n.origin.x)), o(120, $(n.origin.y)), o(130, $(n.origin.z)), o(111, $(n.xAxis.x)), o(121, $(n.xAxis.y)), o(131, $(n.xAxis.z)), o(112, $(n.yAxis.x)), o(122, $(n.yAxis.y)), o(132, $(n.yAxis.z))), q.ucsOrthoType !== void 0 && o(79, q.ucsOrthoType), q.ucsElevation !== void 0 && o(146, $(q.ucsElevation));
	} else o(10, 0), o(20, 0), o(11, 1), o(21, 1), o(12, $($t)), o(22, $(en)), o(13, 0), o(23, 0), o(14, 10), o(24, 10), o(15, 10), o(25, 10), o(16, 0), o(26, 0), o(36, 1), o(17, 0), o(27, 0), o(37, 0), o(40, $(nn)), o(41, $(tn)), o(42, 50), o(43, 0), o(44, 0), o(50, 0), o(51, 0), o(71, 0), o(72, 100), o(73, 1), o(74, 3), o(75, 0), o(76, 0), o(77, 0), o(78, 0), G.ucs && (o(110, $(G.ucs.origin.x)), o(120, $(G.ucs.origin.y)), o(130, $(G.ucs.origin.z)), o(111, $(G.ucs.xAxis.x)), o(121, $(G.ucs.xAxis.y)), o(131, $(G.ucs.xAxis.z)), o(112, $(G.ucs.yAxis.x)), o(122, $(G.ucs.yAxis.y)), o(132, $(G.ucs.yAxis.z)));
	o(0, "ENDTAB");
	let on = (t) => !e.linetypes.some((e) => e.name.toLowerCase() === t), sn = [
		...on("byblock") ? [{
			name: "ByBlock",
			pattern: []
		}] : [],
		...on("bylayer") ? [{
			name: "ByLayer",
			pattern: []
		}] : [],
		...on("continuous") ? [{
			name: "Continuous",
			description: "Solid line",
			pattern: []
		}] : [],
		...e.linetypes.filter(E)
	];
	o(0, "TABLE"), o(2, "LTYPE"), o(5, c()), o(100, "AcDbSymbolTable"), o(70, sn.length);
	for (let e of sn) {
		let t = ut.get(e) ?? c();
		fe.set(e.name.toLowerCase(), t), o(0, "LTYPE"), o(5, t), Pt(e.handle, void 0, t), o(100, "AcDbSymbolTableRecord"), o(100, "AcDbLinetypeTableRecord"), o(2, e.name), o(70, e.xrefDependent ? 48 : 0), o(3, e.description ?? ""), o(72, 65), o(73, e.pattern.length), o(40, $(e.pattern.reduce((e, t) => e + Math.abs(t), 0)));
		for (let t of e.pattern) o(49, $(t)), o(74, 0);
	}
	o(0, "ENDTAB");
	let cn = (e) => e.kind === "aci" ? Math.max(1, Math.min(255, Math.round(e.index))) : e.kind === "rgb" ? n(e.rgb) : 7;
	o(0, "TABLE"), o(2, "LAYER"), o(5, c()), o(100, "AcDbSymbolTable"), o(70, te.length);
	for (let e of te) {
		let t = cn(e.color), n = ut.get(e) ?? c();
		o(0, "LAYER"), o(5, n), Pt(e.handle, void 0, n), o(100, "AcDbSymbolTableRecord"), o(100, "AcDbLayerTableRecord"), o(2, e.name), o(70, +!!e.frozen | (e.locked ? 4 : 0) | (e.xrefDependent ? 48 : 0)), o(62, e.on ? t : -t), e.color.kind === "rgb" && o(420, e.color.rgb), o(6, e.linetype ?? "Continuous"), Q(e.lineweight) && o(370, cr(e.lineweight)), e.plottable === !1 && o(290, 0), o(390, P);
	}
	o(0, "ENDTAB"), o(0, "TABLE"), o(2, "STYLE"), o(5, c()), o(100, "AcDbSymbolTable"), o(70, ft.length);
	for (let e of ft) {
		let t = ut.get(e) ?? c();
		(!e.shapeFile || !de.has(e.name.toLowerCase())) && de.set(e.name.toLowerCase(), t), o(0, "STYLE"), o(5, t), Pt(e.handle, void 0, t), o(100, "AcDbSymbolTableRecord"), o(100, "AcDbTextStyleTableRecord"), o(2, e.name), o(70, +!!e.shapeFile | (e.xrefDependent ? 48 : 0)), o(40, $(e.fixedHeight ?? 0)), o(41, $(e.widthFactor ?? 1)), o(50, $(e.oblique ?? 0)), o(71, 0), o(42, 2.5), o(3, e.font ?? "txt"), o(4, e.bigFont ?? "");
	}
	o(0, "ENDTAB"), o(0, "TABLE"), o(2, "VIEW"), o(5, c()), o(100, "AcDbSymbolTable"), o(70, e.views?.length ?? 0);
	for (let t of e.views ?? []) o(0, "VIEW"), o(5, c()), o(100, "AcDbSymbolTableRecord"), o(100, "AcDbViewTableRecord"), o(2, t.name), o(70, 0), o(40, $(t.height)), o(41, $(t.width)), o(10, $(t.center.x)), o(20, $(t.center.y)), t.direction && (o(11, $(t.direction.x)), o(21, $(t.direction.y)), o(31, $(t.direction.z ?? 1))), t.target && (o(12, $(t.target.x)), o(22, $(t.target.y)), o(32, $(t.target.z ?? 0))), Q(t.lensLength) && o(42, $(t.lensLength));
	o(0, "ENDTAB"), o(0, "TABLE"), o(2, "UCS"), o(5, c()), o(100, "AcDbSymbolTable"), o(70, e.ucs?.length ?? 0);
	for (let t of e.ucs ?? []) o(0, "UCS"), o(5, c()), o(100, "AcDbSymbolTableRecord"), o(100, "AcDbUCSTableRecord"), o(2, t.name), o(70, 0), o(10, $(t.origin.x)), o(20, $(t.origin.y)), o(30, $(t.origin.z ?? 0)), o(11, $(t.xAxis.x)), o(21, $(t.xAxis.y)), o(31, $(t.xAxis.z ?? 0)), o(12, $(t.yAxis.x)), o(22, $(t.yAxis.y)), o(32, $(t.yAxis.z ?? 0));
	o(0, "ENDTAB");
	{
		let t = [...e.appIds ?? []], n = new Set(t.map((e) => e.toUpperCase())), r = (e) => {
			e && !n.has(e.toUpperCase()) && (n.add(e.toUpperCase()), t.push(e));
		};
		t.length || r("ACAD");
		let i = (e) => {
			for (let t of e ?? []) {
				for (let e of t.xdata ?? []) r(e.appName);
				if (t.type === "insert") for (let e of t.attributes ?? []) for (let t of e.xdata ?? []) r(t.appName);
			}
		};
		i(e.entities), i(e.paperSpace);
		for (let e of Object.values(l)) i(e?.entities);
		for (let e of je) for (let t of e.xdata ?? []) r(t.appName);
		for (let e of [...L, ...ve]) for (let t of e.xdata ?? []) r(t.appName);
		he && r("ACAD_MLEADERVER"), o(0, "TABLE"), o(2, "APPID"), o(5, c()), o(100, "AcDbSymbolTable"), o(70, t.length);
		for (let e of t) o(0, "APPID"), o(5, c()), o(100, "AcDbSymbolTableRecord"), o(100, "AcDbRegAppTableRecord"), o(2, e), o(70, 0);
		o(0, "ENDTAB");
	}
	{
		let t = e.dimStyles ?? [], n = t.some((e) => /^standard$/i.test(e.name)) ? t : [{ name: "Standard" }, ...t];
		o(0, "TABLE"), o(2, "DIMSTYLE"), o(5, c()), o(100, "AcDbSymbolTable"), o(70, n.length), o(100, "AcDbDimStyleTable"), o(71, 0);
		for (let e of n) o(0, "DIMSTYLE"), o(105, c()), o(100, "AcDbSymbolTableRecord"), o(100, "AcDbDimStyleTableRecord"), o(2, e.name), o(70, 0);
		o(0, "ENDTAB");
	}
	o(0, "TABLE"), o(2, "BLOCK_RECORD"), o(5, c()), o(100, "AcDbSymbolTable"), o(70, 2 + d.length + w.length + x.length);
	let ln = (e) => e === "*Model_Space" ? j : e === "*Paper_Space" ? M : F[e], un = [];
	for (let e of O) {
		let t = e.blockName ? ln(e.blockName) : /model/i.test(e.name) ? j : M;
		t && un.push({
			l: e,
			h: lt.get(e) ?? c(),
			brh: t
		});
	}
	let dn = new Map(un.map((e) => [e.brh, e.h])), fn = (e, t, n) => {
		o(0, "BLOCK_RECORD"), o(5, e), Pt(t, void 0, e, Et.get(e)?.dict), o(100, "AcDbSymbolTableRecord"), o(100, "AcDbBlockTableRecord"), o(2, n);
	};
	for (let e of ["*Model_Space", "*Paper_Space"].concat(d, w)) {
		let t = e === "*Model_Space" ? k : e === "*Paper_Space" ? A : l[e].handle;
		fn(ln(e), t, dr(e) ? e : re(e));
		let n = dn.get(ln(e));
		n && o(340, n);
	}
	for (let e of x) fn(e.rec, e.src?.handle, e.name);
	o(0, "ENDTAB"), o(0, "ENDSEC");
	let J = j, pn = !1, mn = (e) => {
		e.kind === "byBlock" ? o(62, 0) : e.kind === "aci" ? o(62, e.index) : e.kind === "rgb" && (o(62, n(e.rgb)), o(420, e.rgb));
	}, hn = () => {
		let t = [...e.entities, ...e.paperSpace ?? []];
		for (let e of w) t.push(...l[e].entities);
		return t;
	}, Y = (e, t, n) => {
		let r = ot.get(t) ?? c();
		o(0, e), o(5, r), Pt(t.handle, t.reactors, r), o(330, J), o(100, "AcDbEntity"), pn && o(67, 1), o(8, t.layer || "0"), mn(t.color), t.linetype && o(6, t.linetype), Q(t.lineweight) && o(370, cr(t.lineweight)), Q(t.linetypeScale) && t.linetypeScale > 0 && Math.abs(t.linetypeScale - 1) > 1e-12 && o(48, $(t.linetypeScale)), t.invisible && o(60, 1), n && o(100, n);
	}, gn = (e) => {
		let t = e.extrusion;
		t && (o(210, $(t.x)), o(220, $(t.y)), o(230, $(t.z ?? 1)));
	}, _n = (e) => {
		for (let t = 0; t < e.length; t += 127) {
			let n = "";
			for (let r = t; r < Math.min(t + 127, e.length); r++) n += e[r].toString(16).padStart(2, "0").toUpperCase();
			o(310, n);
		}
	}, vn = (e) => {
		if (!e.strData || !e.strBits) return null;
		let t = ur(e.strData), n = new z(t, 0, e.strBits), r = 0;
		try {
			let t = n.bs();
			if (t >= 3 && n.pos + t * 16 <= e.strBits) {
				let e = "";
				for (let t = 0; t < 3; t++) e += String.fromCharCode(n.rs());
				if (e === "cn:") {
					for (let e = 3; e < t; e++) n.rs();
					r = n.pos;
				}
			}
		} catch {
			r = 0;
		}
		return r < e.strBits ? {
			bytes: t,
			from: r,
			bits: e.strBits - r
		} : null;
	}, yn = (e) => {
		if (o(95, (e.proxyMaint ?? 0) * 65536 + (e.proxyVersion ?? 0)), o(70, +!!e.fromDxf), e.graphicsData) {
			let t = ur(e.graphicsData);
			o(92, t.length), _n(t);
		}
		let t = ((e.proxyVersion ?? 0) & 65535) >= 27, n = t ? vn(e) : null;
		if (e.data || n) {
			let r = new Qe();
			if (e.data) {
				let t = ur(e.data);
				r.putBits(t, e.dataBits ?? t.length * 8);
			}
			if (t) {
				if (!n) r.b(0);
				else {
					for (let e = n.from; e < n.from + n.bits; e++) r.b(n.bytes[e >> 3] >> 7 - (e & 7) & 1);
					let e = n.bits;
					e >= 32768 ? (r.rs(e >> 15), r.rs(e & 32767 | 32768)) : r.rs(e), r.b(1);
				}
			}
			o(93, r.pos), _n(r.bytes());
		}
		bn(e.refs), o(94, 0);
	}, bn = (e) => {
		for (let t of e ?? []) {
			let e = t.code === 2 ? 350 : t.code === 3 ? 360 : t.code === 5 ? 340 : 330, n = t.value.trim();
			o(e, _(n) ?? n);
		}
	}, xn = (e) => ue(ge(Te(e).replace(/\r\n?/g, "\n"), !1)).replace(/\n/g, "\\P"), Sn = (e) => {
		let t = 250;
		for (; t > 200;) {
			if (e[t - 1] === "^") {
				t--;
				continue;
			}
			let n = e.lastIndexOf("\\U+", t - 1);
			if (n >= 0 && n + 7 > t) {
				t = n;
				continue;
			}
			if (e[t - 1] === "%" || e[t - 2] === "%" && e[t - 1] === "%") {
				t--;
				continue;
			}
			break;
		}
		return t;
	}, Cn = (e, t, n) => {
		let r = Ee(e);
		for (; r.length > 250;) {
			let e = Sn(r);
			o(t, r.slice(0, e)), r = r.slice(e);
		}
		o(n, r);
	}, wn = (e) => Cn(e, 3, 1), Tn = (e) => {
		let t, n;
		if (e.type === "mtext") t = Q(e.attachment) && e.attachment >= 1 && e.attachment <= 9 ? e.attachment : 1, n = e.position;
		else {
			let r = e.halign ?? "left", i = e.valign ?? "baseline";
			t = (i === "top" ? 0 : i === "middle" || r === "middle" ? 1 : 2) * 3 + (r === "center" || r === "middle" ? 2 : r === "right" ? 3 : 1), n = (r !== "left" || i !== "baseline") && e.alignmentPoint ? e.alignmentPoint : e.position;
		}
		Y("MTEXT", e, "AcDbMText"), o(10, $(n.x)), o(20, $(n.y)), o(30, $(n.z ?? 0)), o(40, $(Q(e.height) && e.height > 0 ? e.height : 5)), e.type === "mtext" && Q(e.width) && e.width > 0 && o(41, $(e.width)), o(71, t), wn(ir(xn(e.text), 2e3, Q(e.height) && e.height > 0 ? e.height : 5)), o(50, $((e.rotation || 0) * Z)), e.style && o(7, e.style);
	}, En = (e) => {
		o(97, e.length);
		for (let t of e) o(330, t);
	}, Dn = (e, t, n) => {
		let r = e.external !== void 0 || e.derived !== void 0 || e.outermost !== void 0 ? +!!e.external | (e.derived ? 4 : 0) | (e.outermost ? 16 : 0) : +!!t;
		if (e.kind === "polyline") {
			let t = e.vertices.some((e) => Q(e.bulge) && e.bulge !== 0);
			o(92, 2 | r), o(72, +!!t), o(73, +!!e.closed), o(93, e.vertices.length);
			for (let n of e.vertices) o(10, $(n.x)), o(20, $(n.y)), t && o(42, $(n.bulge ?? 0));
			En(n);
		} else if (e.kind === "circle") o(92, r), o(93, 1), o(72, 2), o(10, $(e.center.x)), o(20, $(e.center.y)), o(40, $(e.radius)), o(50, 0), o(51, 360), o(73, 1), En(n);
		else if (e.kind === "ellipse") o(92, r), o(93, 1), o(72, 3), o(10, $(e.center.x)), o(20, $(e.center.y)), o(11, $(e.majorAxis.x)), o(21, $(e.majorAxis.y)), o(40, $(e.ratio)), o(50, 0), o(51, 360), o(73, 1), En(n);
		else {
			o(92, r), o(93, e.edges.length);
			for (let t of e.edges) if (t.kind === "line") o(72, 1), o(10, $(t.start.x)), o(20, $(t.start.y)), o(11, $(t.end.x)), o(21, $(t.end.y));
			else if (t.kind === "arc") o(72, 2), o(10, $(t.center.x)), o(20, $(t.center.y)), o(40, $(t.radius)), o(50, $(t.startAngle * Z)), o(51, $(t.endAngle * Z)), o(73, +!!t.ccw);
			else if (t.kind === "ellipticalArc") o(72, 3), o(10, $(t.center.x)), o(20, $(t.center.y)), o(11, $(t.majorAxis.x)), o(21, $(t.majorAxis.y)), o(40, $(t.ratio)), o(50, $(t.startAngle * Z)), o(51, $(t.endAngle * Z)), o(73, +!!t.ccw);
			else {
				o(72, 4), o(94, t.degree > 0 ? t.degree : 3), o(73, +!!t.weights?.length), o(74, +!!t.periodic), o(95, t.knots.length), o(96, t.controlPoints.length);
				for (let e of t.knots) o(40, $(e));
				for (let e = 0; e < t.controlPoints.length; e++) {
					let n = t.controlPoints[e];
					o(10, $(n.x)), o(20, $(n.y)), t.weights?.length && o(42, $(t.weights[e] ?? 1));
				}
			}
			En(n);
		}
	}, On = (e, t) => {
		Y("ATTRIB", e, "AcDbText"), o(10, $(e.position.x)), o(20, $(e.position.y)), o(30, $(e.position.z ?? 0)), o(40, $(Q(e.height) && e.height > 0 ? e.height : 5)), o(1, Te(e.text).replace(/[\r\n]+/g, " ")), o(50, $((e.rotation || 0) * Z));
		let n = fr[e.halign ?? "left"] ?? 0, r = pr[e.valign ?? "baseline"] ?? 0;
		if (n && o(72, n), n || r) {
			let t = e.alignmentPoint ?? e.position;
			o(11, $(t.x)), o(21, $(t.y)), o(31, $(t.z ?? 0));
		}
		o(100, "AcDbAttribute"), o(2, "ATTR" + (t + 1)), o(70, +!!e.invisible | (e.constant ? 2 : 0)), r && o(74, r);
	}, kn = 0, An = (e) => {
		Y("ATTDEF", e, "AcDbText"), o(10, $(e.position.x)), o(20, $(e.position.y)), o(30, $(e.position.z ?? 0)), o(40, $(Q(e.height) && e.height > 0 ? e.height : 5)), o(1, Te(e.text).replace(/[\r\n]+/g, " ")), o(50, $((e.rotation || 0) * Z));
		let t = fr[e.halign ?? "left"] ?? 0, n = pr[e.valign ?? "baseline"] ?? 0;
		if (t && o(72, t), t || n) {
			let t = e.alignmentPoint ?? e.position;
			o(11, $(t.x)), o(21, $(t.y)), o(31, $(t.z ?? 0));
		}
		o(100, "AcDbAttributeDefinition"), o(3, ""), o(2, "ATTD" + ++kn), o(70, +!!e.invisible | (e.constant ? 2 : 0)), n && o(74, n);
	}, jn = (e) => {
		for (let t of e.xdata ?? []) {
			o(1001, t.appName ?? "ACAD");
			for (let e of t.values) "point" in e ? (o(e.code, $(e.point.x)), o(e.code + 10, $(e.point.y)), o(e.code + 20, $(e.point.z ?? 0))) : e.code === 1005 ? o(1005, _(String(e.value)) ?? (r ? String(e.value) : 0)) : o(e.code, typeof e.value == "number" ? $(e.value) : e.value);
		}
	}, Mn = (e, t, n, s) => {
		let c = e.length;
		for (let t = 0; t < e.length; t++) if (e[t][0] === 100) {
			c = t;
			break;
		}
		let l = !1;
		for (let t = 0; t < c; t++) {
			let n = e[t][0];
			(n === 5 || n === 105) && (l = !0);
		}
		let u = !1, d = !1, f = (e) => {
			o(e, t), Pt(s.src, s.reactors, t), u = !0;
		};
		l || f(5);
		let m = (e) => {
			let t = i(e);
			return !t || t === "0" ? e : p.get(t) ?? (r ? e : "0");
		}, h = !1, g = !1, _ = s.dict === void 0, v = () => {
			if (!_) {
				_ = !0;
				for (let [e, t, n] of s.dict) o(3, e), o(n === 3 ? 360 : 350, t);
			}
		};
		for (let t = 0; t < e.length; t++) {
			let [r, i] = e[t];
			if (r === 102 && t < c && i.trim().startsWith("{")) {
				let n = t + 1;
				for (; n < e.length && e[n][0] !== 102;) n++;
				let r = i.trim().toUpperCase();
				if (r !== "{ACAD_REACTORS" && r !== "{ACAD_XDICTIONARY") for (let r = t; r <= n && r < e.length; r++) a.push(String(e[r][0]), e[r][1]);
				t = n;
				continue;
			}
			if (t < c) {
				if ((r === 5 || r === 105) && !u) {
					f(r);
					continue;
				}
				if (r === 330 && !d) {
					d = !0, o(330, n);
					continue;
				}
				a.push(String(r), i);
				continue;
			}
			if (r === 100) {
				h && v(), h = s.dict !== void 0 && /^AcDbDictionary$/i.test(i.trim()), a.push(String(r), i);
				continue;
			}
			if (h) {
				if (r === 3) {
					g = !0, v();
					continue;
				}
				if ((r === 350 || r === 360) && g) {
					g = !1;
					continue;
				}
				g = !1;
			}
			if (r >= 320 && r <= 369 || r === 1005) {
				a.push(String(r), m(i));
				continue;
			}
			a.push(String(r), i);
		}
		_ || v();
	}, Nn = (e, t, n, r) => {
		let a = e.hardOwner ? 3 : 2, s = [], c = /* @__PURE__ */ new Set(), l = new Set(r.map(([e]) => i(e)));
		for (let t of e.entries ?? []) {
			let e = i(t.name);
			if (l.has(e) || c.has(e)) continue;
			let n = _(t.handle);
			n && (c.add(e), s.push([
				t.name,
				n,
				t.code === 3 || t.code === 5 ? 3 : t.code === 2 || t.code === 4 ? 2 : a
			]));
		}
		for (let [e, t, n] of r) {
			let r = i(e);
			c.has(r) || (c.add(r), s.push([
				e,
				t,
				n
			]));
		}
		if (o(0, e.sourceType || "DICTIONARY"), e.tags?.length) {
			Mn(e.tags, t, n, {
				src: e.handle,
				reactors: e.reactors,
				dict: s
			});
			return;
		}
		o(5, t), Pt(e.handle, e.reactors, t), o(330, n), o(100, "AcDbDictionary"), e.hardOwner && o(280, 1), o(281, e.cloning ?? 1);
		for (let [e, t, n] of s) o(3, e), o(n === 3 ? 360 : 350, t);
		jn(e);
	}, Pn = (e, t, n, a) => {
		o(0, "XRECORD"), o(5, t), Pt(a?.handle, a?.reactors, t), o(330, n), o(100, "AcDbXrecord"), o(280, a?.cloning ?? 1);
		for (let t of e.values) if ("point" in t) o(t.code, $(t.point.x)), o(t.code + 10, $(t.point.y)), o(t.code + 20, $(t.point.z ?? 0));
		else if (t.code >= 320 && t.code <= 369) {
			let e = String(t.value);
			o(t.code, _(e) ?? (r && i(e) !== "0" ? e : 0));
		} else o(t.code, typeof t.value == "number" ? $(t.value) : t.value);
	}, Fn = (e, t, n) => {
		let r = e.encoding ?? 2018, i = new Qe();
		if (e.data && e.dataBits && i.putBits(ur(e.data), e.dataBits), r >= 2007) {
			let t = e.strData ? e.strBits ?? 0 : 0;
			t === 0 ? i.b(0) : (i.putBits(ur(e.strData), t), t >= 32768 ? (i.rs(t >> 15), i.rs(t & 32767 | 32768)) : i.rs(t), i.b(1));
		}
		let a = i.pos;
		o(0, "ACAD_PROXY_OBJECT"), o(5, t), Pt(e.handle, e.reactors, t), o(330, n), o(100, "AcDbProxyObject"), o(90, 499), o(91, Vt(e.appClass.dxfName)), o(95, Ke(e)), o(70, 0), o(93, a), _n(i.bytes()), bn(e.refs), o(94, 0), jn(e);
	}, In = (e) => de.get((e ?? "").toLowerCase()) ?? de.get("standard") ?? [...de.values()][0] ?? "0", Ln = (e) => {
		let t = { ...e };
		return delete t.handle, delete t.reactors, delete t.xdict, t;
	}, Rn = (e, t, n) => {
		let r = Ln(e), i = [t];
		for (let t of e.columnWidths) i.push(i[i.length - 1] + t);
		let a = [n];
		for (let t of e.rowHeights) a.push(a[a.length - 1] - t);
		let s = (e, t, n, i) => {
			Y("LWPOLYLINE", r, "AcDbPolyline"), o(90, 4), o(70, 1), o(10, $(e)), o(20, $(t)), o(10, $(n)), o(20, $(t)), o(10, $(n)), o(20, $(i)), o(10, $(e)), o(20, $(i));
		};
		for (let t = 0; t < e.numRows; t++) for (let n = 0; n < e.numColumns; n++) {
			s(i[n], a[t], i[n + 1], a[t + 1]);
			let r = e.cells[t * e.numColumns + n];
			if (!r?.text) continue;
			let o = r.textHeight && r.textHeight > 0 ? r.textHeight : Math.max(.1, Math.abs(a[t + 1] - a[t]) * .6);
			Wn({
				type: "text",
				layer: e.layer,
				color: e.color,
				position: {
					x: i[n] + o * .2,
					y: a[t + 1] + o * .2,
					z: 0
				},
				text: r.text,
				height: o,
				rotation: 0
			});
		}
	}, zn = (e) => {
		let t = Ln(e);
		for (let n of e.leaders) for (let e of n.lines) {
			let r = n.landing && e.length ? [...e, n.landing] : e;
			if (!(r.length < 2)) {
				Y("LWPOLYLINE", t, "AcDbPolyline"), o(90, r.length), o(70, 0);
				for (let e of r) o(10, $(e.x)), o(20, $(e.y));
			}
		}
		e.text && e.textPosition && Wn({
			type: "mtext",
			layer: e.layer,
			color: e.color,
			position: e.textPosition,
			text: e.text,
			height: e.textHeight ?? 2.5,
			rotation: e.textRotation ?? 0
		});
	}, Bn = (e, t) => {
		let n = (l[e]?.entities ?? []).filter((e) => e.type === "text" && e.attribute === "attdef");
		if (t.attdef) {
			let e = _(t.attdef);
			if (e && n.some((t) => ot.get(t) === e)) return e;
		}
		let r = n[(t.index || 1) - 1];
		return r && ot.get(r) || "0";
	}, Vn = (e) => {
		let t = e.text !== void 0 && e.text !== null, n = e.blockName ? F[e.blockName] : void 0, r = !t && !!n, i = Q(e.scale) && e.scale > 0 ? e.scale : 1, a = Q(e.textHeight) && e.textHeight > 0 ? e.textHeight : .18, s = Q(e.arrowSize) && e.arrowSize > 0 ? e.arrowSize : .18, c = e.leaders[0], l = Q(c?.doglegLength) ? c.doglegLength : 0, u = e.leaders.flatMap((e) => e.lines).find((e) => e.length)?.[0], d = c?.landing && c.doglegVector ? {
			x: c.landing.x + c.doglegVector.x * l,
			y: c.landing.y + c.doglegVector.y * l,
			z: (c.landing.z ?? 0) + (c.doglegVector.z ?? 0) * l
		} : e.textPosition ?? e.blockPosition ?? c?.landing ?? u ?? {
			x: 0,
			y: 0,
			z: 0
		}, f = In(e.textStyle), p = (e, t) => {
			o(e, $(t.x)), o(e + 10, $(t.y)), o(e + 20, $(t.z ?? 0));
		};
		if (Y("MULTILEADER", e, "AcDbMLeader"), o(300, "CONTEXT_DATA{"), o(40, $(i)), p(10, d), o(41, $(a)), o(140, $(s)), o(145, .09), o(174, 1), o(175, 1), o(176, 0), o(177, 0), o(290, +!!t), t) {
			Cn(xn(e.text), 304, 304), o(11, 0), o(21, 0), o(31, 1), o(340, f), p(12, e.textPosition ?? d);
			let t = e.textRotation ?? 0;
			o(13, $(Math.cos(t))), o(23, $(Math.sin(t))), o(33, 0), o(42, $(t)), o(43, 0), o(44, 0), o(45, 1), o(170, 1), o(90, -1073741824), o(171, 1), o(172, 5), o(91, -1073741824), o(141, 0), o(92, 13421772), o(291, 0), o(292, 0), o(173, 0), o(293, 0), o(142, 0), o(143, 0), o(294, 0), o(295, 0);
		}
		if (o(296, +!!r), r) {
			o(341, n), o(14, 0), o(24, 0), o(34, 1);
			let t = e.blockPosition ?? d, r = e.blockScale ?? {
				x: 1,
				y: 1,
				z: 1
			}, i = e.blockRotation ?? 0;
			p(15, t), o(16, $(r.x)), o(26, $(r.y)), o(36, $(r.z ?? 1)), o(46, $(i)), o(93, -1073741824);
			let a = Math.cos(i), s = Math.sin(i);
			for (let e of [
				r.x * a,
				-r.y * s,
				0,
				t.x,
				r.x * s,
				r.y * a,
				0,
				t.y,
				0,
				0,
				r.z ?? 1,
				t.z ?? 0,
				0,
				0,
				0,
				1
			]) o(47, $(e));
		}
		p(110, u ?? d), o(111, 1), o(121, 0), o(131, 0), o(112, 0), o(122, 1), o(132, 0), o(297, 0), e.leaders.forEach((e, t) => {
			let n = e.lines.find((e) => e.length)?.slice(-1)[0], r = e.landing ?? n ?? d, i = e.doglegVector ?? {
				x: 1,
				y: 0,
				z: 0
			};
			o(302, "LEADER{"), o(290, 1), o(291, 1), p(10, r), p(11, i), o(90, t), o(40, $(Q(e.doglegLength) ? e.doglegLength : l)), e.lines.forEach((e, t) => {
				o(304, "LEADER_LINE{");
				for (let t of e) p(10, t);
				o(91, t), o(305, "}");
			}), o(303, "}");
		}), o(301, "}"), o(340, we(e.styleName)), o(90, 33686144 | (r ? 13632512 : 0)), o(170, 1), o(91, -1056964608), o(341, fe.get("byblock") ?? "0"), o(171, -2), o(290, e.hasLanding === !1 ? 0 : 1), o(291, e.hasDogleg === !1 ? 0 : 1), o(41, $(l)), o(42, $(s)), o(172, r ? 1 : 2), o(343, f), o(173, 1), o(95, 1), o(174, 1), o(175, 0), o(92, -1056964608), o(292, 0), r && o(344, n), o(93, -1056964608);
		let m = e.blockScale ?? {
			x: 1,
			y: 1,
			z: 1
		};
		if (o(10, $(m.x)), o(20, $(m.y)), o(30, $(m.z ?? 1)), o(43, $(e.blockRotation ?? 0)), o(176, 0), o(293, 0), r) for (let t of e.attributes ?? []) typeof t.text == "string" && (o(330, Bn(e.blockName, t)), o(177, t.index || 1), o(44, $(t.width ?? 0)), o(302, Te(t.text)));
		o(294, 0), o(178, 0), o(179, 1), o(45, $(i));
	}, Hn = (t, r, i) => {
		let a = t.numRows, s = t.numColumns, c = new Uint8Array(a * s);
		for (let e = 0; e < a; e++) for (let n = 0; n < s; n++) {
			let r = t.cells[e * s + n];
			if (!r || c[e * s + n]) continue;
			let i = Math.max(1, r.spanColumns ?? 1), o = Math.max(1, r.spanRows ?? 1);
			for (let t = e; t < Math.min(a, e + o); t++) for (let r = n; r < Math.min(s, n + i); r++) (t !== e || r !== n) && (c[t * s + r] = 1);
		}
		Y("ACAD_TABLE", t, "AcDbBlockReference"), o(2, r), o(10, $(t.position.x)), o(20, $(t.position.y)), o(30, $(t.position.z ?? 0)), o(100, "AcDbTable"), o(342, Ce(t.styleName)), o(343, i);
		let l = t.direction ?? {
			x: 1,
			y: 0,
			z: 0
		};
		o(11, $(l.x)), o(21, $(l.y)), o(31, $(l.z ?? 0)), o(90, 22), o(91, a), o(92, s);
		let u = +!!t.titleSuppressed | (t.headerSuppressed ? 2 : 0) | (Q(t.flowDirection) ? 4 : 0) | (Q(t.horizontalMargin) ? 8 : 0) | (Q(t.verticalMargin) ? 16 : 0);
		o(93, u), o(94, 0), o(95, 0), o(96, 0), u & 1 && o(280, 1), u & 2 && o(281, 1), u & 4 && o(70, t.flowDirection), u & 8 && o(40, $(t.horizontalMargin)), u & 16 && o(41, $(t.verticalMargin));
		for (let e = 0; e < a; e++) o(141, $(Q(t.rowHeights[e]) ? t.rowHeights[e] : 1));
		for (let e = 0; e < s; e++) o(142, $(Q(t.columnWidths[e]) ? t.columnWidths[e] : 1));
		let d = (e) => e.kind === "byBlock" ? 0 : e.kind === "byLayer" ? 256 : e.kind === "aci" ? e.index : n(e.rgb), f = (t) => !!t && e.textStyles.some((e) => e.name.toLowerCase() === t.toLowerCase()), p = [
			"top",
			"right",
			"bottom",
			"left"
		], m = {
			top: [
				279,
				289,
				69
			],
			right: [
				275,
				285,
				65
			],
			bottom: [
				276,
				286,
				66
			],
			left: [
				278,
				288,
				68
			]
		};
		for (let e = 0; e < a * s; e++) {
			let n = t.cells[e] ?? {}, r = c[e] === 1 || n.merged === !0, i = n.contentType === 2 && n.blockName ? F[n.blockName] : void 0, a = Q(n.textHeight) && n.textHeight > 0, s = f(n.textStyle) ? n.textStyle : void 0, l = (n.alignment !== void 0 || i ? 1 : 0) | (n.fillEnabled === void 0 ? 0 : 2) | (n.fillColor ? 4 : 0) | (n.textColor ? 8 : 0) | (s ? 16 : 0) | (a ? 32 : 0);
			if (p.forEach((e, t) => {
				let r = n.borders?.[e];
				r && (r.color && (l |= 64 << t), Q(r.lineweight) && (l |= 1024 << t), r.visible !== void 0 && (l |= 16384 << t));
			}), o(171, i ? 2 : 1), o(172, p.reduce((e, t, r) => n.borders?.[t] ? e | 1 << r : e, 0)), o(173, +!!r), o(174, +!!n.autofit), o(175, r ? 1 : Math.max(1, n.spanColumns ?? 1)), o(176, r ? 1 : Math.max(1, n.spanRows ?? 1)), o(177, l & 65535), o(178, 0), o(145, $(Q(n.rotation) ? n.rotation : 0)), i) {
				o(340, i), o(144, 1);
				let e = (n.attributes ?? []).filter((e) => typeof e.text == "string");
				o(179, e.length);
				for (let t of e) o(331, Bn(n.blockName, t)), o(300, Te(t.text));
				o(170, n.alignment ?? 5);
			} else wn(xn(n.text ?? "")), n.alignment !== void 0 && o(170, n.alignment);
			n.fillEnabled !== void 0 && o(283, +!n.fillEnabled), n.fillColor && o(63, d(n.fillColor)), n.textColor && o(64, d(n.textColor)), s && o(7, Te(s)), a && o(140, $(n.textHeight));
			for (let e of [
				"right",
				"bottom",
				"left",
				"top"
			]) {
				let t = n.borders?.[e];
				if (!t) continue;
				let [r, i, a] = m[e];
				Q(t.lineweight) && o(r, t.lineweight), t.visible !== void 0 && o(i, +!t.visible), t.color && o(a, d(t.color));
			}
		}
	}, Un = (e) => {
		if (Wn(e), !(e.type === "insert" && e.attributes?.length) && !(e.type === "unknown" && e.tags?.length)) {
			if (e.type === "mleader" && C) {
				let t = e.xdata ?? [];
				jn({ xdata: t.some((e) => e.appName === "ACAD_MLEADERVER") ? t : [...t, {
					appName: "ACAD_MLEADERVER",
					values: [{
						code: 1070,
						value: 2
					}]
				}] });
				return;
			}
			jn(e);
		}
	}, Wn = (t) => {
		switch (t.type) {
			case "line":
				Y("LINE", t, "AcDbLine"), o(10, $(t.start.x)), o(20, $(t.start.y)), o(30, $(t.start.z ?? 0)), o(11, $(t.end.x)), o(21, $(t.end.y)), o(31, $(t.end.z ?? 0));
				return;
			case "point":
				Y("POINT", t, "AcDbPoint"), o(10, $(t.position.x)), o(20, $(t.position.y)), o(30, $(t.position.z ?? 0));
				return;
			case "ray":
			case "xline":
				Y(t.type === "ray" ? "RAY" : "XLINE", t, t.type === "ray" ? "AcDbRay" : "AcDbXline"), o(10, $(t.basePoint.x)), o(20, $(t.basePoint.y)), o(30, $(t.basePoint.z ?? 0)), o(11, $(t.direction.x)), o(21, $(t.direction.y)), o(31, $(t.direction.z ?? 0));
				return;
			case "polyline": {
				if (t.vertices.length < 2) return;
				let e = t.heavy === "3d" || t.vertices.some((e) => e.z !== void 0);
				if (t.heavy || e) {
					let n = t.fit, r = !!t.closed | (n === "curve" ? 2 : n ? 4 : 0) | (e ? 8 : 0) | (t.plineGen ? 128 : 0);
					Y("POLYLINE", t, e ? "AcDb3dPolyline" : "AcDb2dPolyline"), o(66, 1), o(10, 0), o(20, 0), o(30, e ? 0 : $(t.elevation ?? 0)), o(70, r), n === "quadratic" ? o(75, 5) : n === "cubic" && o(75, 6), e || gn(t);
					let i = () => {
						o(100, "AcDbEntity"), pn && o(67, 1), o(8, t.layer || "0"), mn(t.color), t.linetype && o(6, t.linetype), Q(t.lineweight) && o(370, cr(t.lineweight));
					}, a = (n, r) => {
						o(0, "VERTEX"), o(5, c()), o(330, J), i(), o(100, "AcDbVertex"), o(100, e ? "AcDb3dPolylineVertex" : "AcDb2dVertex"), o(10, $(n.x)), o(20, $(n.y)), o(30, $(e ? n.z ?? 0 : t.elevation ?? 0)), e || (Q(n.startWidth) && n.startWidth !== 0 && o(40, $(n.startWidth)), Q(n.endWidth) && n.endWidth !== 0 && o(41, $(n.endWidth)), Q(n.bulge) && n.bulge !== 0 && o(42, $(n.bulge))), o(70, r | (e ? 32 : 0) | (Q(n.tangent) ? 2 : 0)), Q(n.tangent) && o(50, $(n.tangent * Z)), Q(n.id) && n.id && o(91, n.id);
					}, s = n && n !== "curve" ? t.frame ?? [] : [];
					s.length && a(s[0], 16);
					for (let e of t.vertices) a(e, n === "curve" ? +!!e.curveFit : n ? 8 : 0);
					for (let e of s.slice(1)) a(e, 16);
					o(0, "SEQEND"), o(5, c()), o(330, J), i();
					return;
				}
				Y("LWPOLYLINE", t, "AcDbPolyline"), o(90, t.vertices.length), o(70, +!!t.closed | (t.plineGen ? 128 : 0)), Q(t.constantWidth) && t.constantWidth > 0 && o(43, $(t.constantWidth)), Q(t.elevation) && t.elevation !== 0 && o(38, $(t.elevation)), gn(t);
				for (let e of t.vertices) o(10, $(e.x)), o(20, $(e.y)), Q(e.startWidth) && o(40, $(e.startWidth)), Q(e.endWidth) && o(41, $(e.endWidth)), Q(e.bulge) && e.bulge !== 0 && o(42, $(e.bulge)), Q(e.id) && e.id && o(91, e.id);
				return;
			}
			case "circle":
				Y("CIRCLE", t, "AcDbCircle"), o(10, $(t.center.x)), o(20, $(t.center.y)), o(30, $(t.center.z ?? 0)), o(40, $(t.radius)), gn(t);
				return;
			case "arc":
				Y("ARC", t, "AcDbCircle"), o(10, $(t.center.x)), o(20, $(t.center.y)), o(30, $(t.center.z ?? 0)), o(40, $(t.radius)), gn(t), o(100, "AcDbArc"), o(50, $(t.startAngle * Z)), o(51, $(t.endAngle * Z));
				return;
			case "ellipse":
				Y("ELLIPSE", t, "AcDbEllipse"), o(10, $(t.center.x)), o(20, $(t.center.y)), o(30, $(t.center.z ?? 0)), o(11, $(t.majorAxis.x)), o(21, $(t.majorAxis.y)), o(31, $(t.majorAxis.z ?? 0)), o(40, $(t.ratio)), o(41, $(t.startParam)), o(42, $(t.endParam)), gn(t);
				return;
			case "spline": {
				let e = t.controlPoints, n = t.fitPoints ?? [];
				if (e.length < 2 && n.length < 2) return;
				if (Y("SPLINE", t, "AcDbSpline"), o(210, 0), o(220, 0), o(230, 1), o(70, 8 | !!t.closed), o(71, t.degree > 0 ? t.degree : 3), e.length >= 2) {
					o(72, t.knots.length), o(73, e.length), o(74, n.length);
					for (let e of t.knots) o(40, $(e));
					if (t.weights) for (let e of t.weights) o(41, $(e));
					for (let t of e) o(10, $(t.x)), o(20, $(t.y)), o(30, $(t.z ?? 0));
					for (let e of n) o(11, $(e.x)), o(21, $(e.y)), o(31, $(e.z ?? 0));
				} else {
					o(72, 0), o(73, 0), o(74, n.length);
					for (let e of n) o(11, $(e.x)), o(21, $(e.y)), o(31, $(e.z ?? 0));
				}
				return;
			}
			case "mtext":
				Tn(t);
				return;
			case "text": {
				if (t.attribute === "attdef") {
					An(t);
					return;
				}
				if (_e(t.text)) {
					Tn(t);
					return;
				}
				let e = fr[t.halign ?? "left"] ?? 0, n = pr[t.valign ?? "baseline"] ?? 0;
				if (Y("TEXT", t, "AcDbText"), o(10, $(t.position.x)), o(20, $(t.position.y)), o(30, $(t.position.z ?? 0)), o(40, $(Q(t.height) && t.height > 0 ? t.height : 5)), o(1, Te(t.text).replace(/[\r\n]+/g, " ")), o(50, $((t.rotation || 0) * Z)), Q(t.widthFactor) && t.widthFactor > 0 && t.widthFactor !== 1 && o(41, $(t.widthFactor)), Q(t.oblique) && t.oblique !== 0 && o(51, $(t.oblique * Z)), t.style && o(7, t.style), e && o(72, e), e || n) {
					let e = t.alignmentPoint ?? t.position;
					o(11, $(e.x)), o(21, $(e.y)), o(31, $(e.z ?? 0));
				}
				gn(t), o(100, "AcDbText"), n && o(73, n);
				return;
			}
			case "solid":
				Y("SOLID", t, "AcDbTrace");
				for (let e = 0; e < 4; e++) {
					let n = t.corners[e];
					o(10 + e, $(n.x)), o(20 + e, $(n.y)), o(30 + e, $(n.z ?? 0));
				}
				gn(t);
				return;
			case "hatch": {
				if (!t.loops.length) return;
				Y("HATCH", t, "AcDbHatch"), o(10, 0), o(20, 0), o(30, $(t.elevation ?? 0));
				let e = t.extrusion ?? {
					x: 0,
					y: 0,
					z: 1
				};
				o(210, $(e.x)), o(220, $(e.y)), o(230, $(e.z ?? 1)), o(2, t.solid ? "SOLID" : t.patternName || "ANSI31"), o(70, +!!t.solid);
				let n = kt.get(t);
				if (o(71, +!!n), o(91, t.loops.length), t.loops.forEach((e, t) => Dn(e, t === 0, n?.[t] ?? [])), o(75, t.styleFlag ?? 0), o(76, t.patternType ?? 1), !t.solid) {
					let e = Q(t.angle) ? t.angle : 0, n = Q(t.scale) && t.scale > 0 ? t.scale : 1;
					if (o(52, $(e)), o(41, $(n)), o(77, +!!t.doubled), t.definitionLines?.length) {
						o(78, t.definitionLines.length);
						for (let e of t.definitionLines) {
							o(53, $(e.angle)), o(43, $(e.base.x)), o(44, $(e.base.y)), o(45, $(e.offset.x)), o(46, $(e.offset.y)), o(79, e.dashes.length);
							for (let t of e.dashes) o(49, $(t));
						}
					} else {
						let r = 6 * n, i = (t.patternName || "ANSI31").toUpperCase(), a = i.indexOf("CROSS") >= 0 || i === "ANSI37" || i === "NET" || i === "GRID" || i === "SQUARE" ? [45 + e, 135 + e] : [45 + e];
						o(78, a.length);
						for (let e of a) {
							let t = e * or;
							o(53, $(e)), o(43, 0), o(44, 0), o(45, $(-r * Math.sin(t))), o(46, $(r * Math.cos(t))), o(79, 0);
						}
					}
				}
				t.pixelSize !== void 0 && o(47, $(t.pixelSize)), o(98, t.seeds?.length ?? 0);
				for (let e of t.seeds ?? []) o(10, $(e.x)), o(20, $(e.y));
				return;
			}
			case "face3d":
				Y("3DFACE", t, "AcDbFace");
				for (let e = 0; e < 4; e++) {
					let n = t.corners[e];
					o(10 + e, $(n.x)), o(20 + e, $(n.y)), o(30 + e, $(n.z ?? 0));
				}
				t.invisibleEdges && o(70, t.invisibleEdges);
				return;
			case "shape":
				Y("SHAPE", t, "AcDbShape"), o(10, $(t.position.x)), o(20, $(t.position.y)), o(30, $(t.position.z ?? 0)), o(40, $(t.size > 0 ? t.size : 1)), o(2, t.name || "SHAPE_" + (t.styleId ?? 0)), t.rotation && o(50, $(t.rotation * Z)), Q(t.widthFactor) && t.widthFactor !== 1 && o(41, $(t.widthFactor)), Q(t.oblique) && t.oblique !== 0 && o(51, $(t.oblique * Z));
				return;
			case "tolerance":
				Y("TOLERANCE", t, "AcDbFcf"), o(3, "Standard"), o(10, $(t.position.x)), o(20, $(t.position.y)), o(30, $(t.position.z ?? 0)), o(1, Te(t.text).replace(/\n/g, "^J")), o(11, $(t.xDirection.x)), o(21, $(t.xDirection.y)), o(31, $(t.xDirection.z ?? 0));
				return;
			case "mline": {
				if (t.vertices.length < 2) return;
				Y("MLINE", t, "AcDbMline");
				let e = le.get((t.styleName ?? "").toLowerCase()) ?? 0;
				o(2, I[e]?.name ?? "Standard"), o(340, ce[e] ?? "0"), o(40, $(Q(t.scale) && t.scale !== 0 ? t.scale : 1)), o(70, t.justification), o(71, 1 | (t.closed ? 2 : 0)), o(72, t.vertices.length), o(73, t.vertices[0]?.lines.length ?? 0), o(10, $(t.basePoint.x)), o(20, $(t.basePoint.y)), o(30, $(t.basePoint.z ?? 0));
				for (let e of t.vertices) {
					o(11, $(e.position.x)), o(21, $(e.position.y)), o(31, $(e.position.z ?? 0)), o(12, $(e.direction.x)), o(22, $(e.direction.y)), o(32, $(e.direction.z ?? 0)), o(13, $(e.miterDirection.x)), o(23, $(e.miterDirection.y)), o(33, $(e.miterDirection.z ?? 0));
					for (let t of e.lines) {
						o(74, t.segparms.length);
						for (let e of t.segparms) o(41, $(e));
						o(75, t.areaFillParms?.length ?? 0);
						for (let e of t.areaFillParms ?? []) o(42, $(e));
					}
				}
				return;
			}
			case "mesh": {
				if (!t.vertices.length) return;
				let e = t.meshKind === "grid";
				Y("POLYLINE", t, e ? "AcDbPolygonMesh" : "AcDbPolyFaceMesh"), o(66, 1), o(10, 0), o(20, 0), o(30, 0), e ? (o(70, 16 | !!t.closedM | (t.closedN ? 32 : 0)), o(71, t.mSize ?? t.vertices.length), o(72, t.nSize ?? 1)) : (o(70, 64), o(71, t.vertices.length), o(72, t.faces?.length ?? 0));
				let n = () => {
					o(100, "AcDbEntity"), o(8, t.layer || "0"), t.linetype && o(6, t.linetype);
				};
				for (let r of t.vertices) o(0, "VERTEX"), o(5, c()), o(330, J), n(), o(100, "AcDbVertex"), o(100, e ? "AcDbPolygonMeshVertex" : "AcDbPolyFaceMeshVertex"), o(10, $(r.x)), o(20, $(r.y)), o(30, $(r.z ?? 0)), o(70, e ? 64 : 192);
				if (!e) for (let e of t.faces ?? []) o(0, "VERTEX"), o(5, c()), o(330, J), n(), o(100, "AcDbFaceRecord"), o(10, 0), o(20, 0), o(30, 0), o(70, 128), e.slice(0, 4).forEach((e, t) => o(71 + t, e));
				o(0, "SEQEND"), o(5, c()), o(330, J), n();
				return;
			}
			case "image": {
				let e = t.wipeout ? "0" : ae(t.path ?? "", t.widthPx, t.heightPx);
				Y(t.wipeout ? "WIPEOUT" : "IMAGE", t, t.wipeout ? "AcDbWipeout" : "AcDbRasterImage"), o(90, 0), o(10, $(t.position.x)), o(20, $(t.position.y)), o(30, $(t.position.z ?? 0)), o(11, $(t.uVector.x)), o(21, $(t.uVector.y)), o(31, $(t.uVector.z ?? 0)), o(12, $(t.vVector.x)), o(22, $(t.vVector.y)), o(32, $(t.vVector.z ?? 0)), o(13, $(t.widthPx)), o(23, $(t.heightPx)), o(340, e);
				let n = !!(t.clip && t.clip.length);
				o(70, 3 | (n ? 4 : 0)), o(280, +!!n), o(281, $(t.brightness ?? 50)), o(282, $(t.contrast ?? 50)), o(283, $(t.fade ?? 0)), o(360, 0);
				let r = t.clip && t.clip.length ? t.clip : [{
					x: -.5,
					y: -.5
				}, {
					x: t.widthPx - .5,
					y: t.heightPx - .5
				}], i = r[0], a = r[r.length - 1], s = r.length > 2 && (i.x !== a.x || i.y !== a.y) ? [...r, i] : r;
				o(71, r.length === 2 ? 1 : 2), o(91, s.length);
				for (let e of s) o(14, $(e.x)), o(24, $(e.y));
				t.clipInverted && o(290, 1);
				return;
			}
			case "underlay": {
				let e = ke(t.underlayKind, t.path ?? "", t.itemName ?? "");
				Y(t.underlayKind.toUpperCase() + "UNDERLAY", t, "AcDbUnderlayReference"), o(340, e), o(10, $(t.position.x)), o(20, $(t.position.y)), o(30, $(t.position.z ?? 0)), o(41, $(t.scale.x || 1)), o(42, $(t.scale.y || 1)), o(43, $(t.scale.z || 1)), o(50, $((t.rotation || 0) * Z)), o(280, t.flags ?? 2), o(281, $(t.contrast ?? 100)), o(282, $(t.fade ?? 0));
				for (let e of t.clip ?? []) o(11, $(e.x)), o(21, $(e.y));
				return;
			}
			case "insert": {
				if (!t.blockName) return;
				let e = t.attributes ?? [];
				Y("INSERT", t, "AcDbBlockReference"), e.length && o(66, 1), o(2, re(t.blockName)), o(10, $(t.position.x)), o(20, $(t.position.y)), o(30, $(t.position.z ?? 0)), o(41, $(Q(t.scale.x) ? t.scale.x : 1)), o(42, $(Q(t.scale.y) ? t.scale.y : 1)), o(43, $(Q(t.scale.z) && t.scale.z !== 0 ? t.scale.z : 1)), o(50, $((t.rotation || 0) * Z)), Q(t.columnCount) && t.columnCount > 1 && o(70, t.columnCount), Q(t.rowCount) && t.rowCount > 1 && o(71, t.rowCount), Q(t.columnSpacing) && o(44, $(t.columnSpacing)), Q(t.rowSpacing) && o(45, $(t.rowSpacing)), gn(t), e.length && (jn(t), e.forEach(On), o(0, "SEQEND"), o(5, c()), o(330, J), o(100, "AcDbEntity"), o(8, t.layer || "0"));
				return;
			}
			case "leader":
				if (t.vertices.length < 2) return;
				Y("LEADER", t, "AcDbLeader"), o(3, "Standard"), o(71, t.hasArrowhead === !1 ? 0 : 1), o(72, 0);
				{
					let e = _(t.annotation);
					o(73, e ? t.annotationType ?? 0 : 3), o(76, t.vertices.length);
					for (let e of t.vertices) o(10, $(e.x)), o(20, $(e.y)), o(30, $(e.z ?? 0));
					e && o(340, e);
				}
				return;
			case "dimension": {
				Y("DIMENSION", t, "AcDbDimension"), t.blockName && o(2, re(t.blockName)), o(10, $(t.definitionPoint.x)), o(20, $(t.definitionPoint.y)), o(30, $(t.definitionPoint.z ?? 0));
				let e = t.textMidpoint ?? t.definitionPoint;
				o(11, $(e.x)), o(21, $(e.y)), o(31, $(e.z ?? 0)), o(70, t.dimensionType), Q(t.attachment) && o(71, t.attachment), Q(t.lineSpacingStyle) && t.lineSpacingStyle !== 1 && o(72, t.lineSpacingStyle), Q(t.lineSpacingFactor) && t.lineSpacingFactor !== 1 && o(41, $(t.lineSpacingFactor)), Q(t.measurement) && o(42, $(t.measurement)), t.text != null && o(1, Te(t.text)), Q(t.textRotation) && t.textRotation !== 0 && o(53, $(t.textRotation * Z)), Q(t.horizDirection) && t.horizDirection !== 0 && o(51, $(t.horizDirection * Z)), o(3, "Standard");
				let n = (e, t) => {
					t && (o(e, $(t.x)), o(e + 10, $(t.y)), o(e + 20, $(t.z ?? 0)));
				};
				switch (t.kind) {
					case "linear":
						o(100, "AcDbAlignedDimension"), n(13, t.point13), n(14, t.point14), Q(t.rotation) && t.rotation !== 0 && o(50, $(t.rotation * Z)), Q(t.obliqueAngle) && t.obliqueAngle !== 0 && o(52, $(t.obliqueAngle * Z)), o(100, "AcDbRotatedDimension");
						break;
					case "aligned":
						o(100, "AcDbAlignedDimension"), n(13, t.point13), n(14, t.point14), Q(t.obliqueAngle) && t.obliqueAngle !== 0 && o(52, $(t.obliqueAngle * Z));
						break;
					case "ordinate":
						o(100, "AcDbOrdinateDimension"), n(13, t.point13), n(14, t.point14);
						break;
					case "radius":
						o(100, "AcDbRadialDimension"), n(15, t.point15), Q(t.leaderLength) && o(40, $(t.leaderLength));
						break;
					case "diameter":
						o(100, "AcDbDiametricDimension"), n(15, t.point15), Q(t.leaderLength) && o(40, $(t.leaderLength));
						break;
					case "angular3pt":
						o(100, "AcDb3PointAngularDimension"), n(13, t.point13), n(14, t.point14), n(15, t.point15);
						break;
					case "angular2ln":
						o(100, "AcDb2LineAngularDimension"), n(13, t.point13), n(14, t.point14), n(15, t.point15), n(16, t.point16);
						break;
					case "arc": o(100, "AcDbArcDimension"), n(13, t.point13), n(14, t.point14), n(15, t.point15);
				}
				return;
			}
			case "acis": {
				let n = it(t);
				if (!n) return;
				let r = t.kind === "region" ? "REGION" : t.kind === "solid3d" ? "3DSOLID" : "BODY", i = parseInt(n, 10);
				if (isFinite(i) && i >= 21800) {
					e.warnings.push(r + " skipped in DXF: its " + (n.includes("asmheader") ? "ASM" : "kernel") + " stream (v" + i + ") has no AC1015 spelling AutoCAD accepts.");
					return;
				}
				Y(r, t, "AcDbModelerGeometry"), o(70, 1);
				for (let e of n.split("\n")) {
					let t = "", n = e.replace(/\r$/, "");
					for (let e = 0; e < n.length; e++) {
						let r = n.charCodeAt(e);
						t += String.fromCharCode(r <= 32 || r > 126 ? r : 159 - r);
					}
					for (o(1, t.slice(0, 255)), t = t.slice(255); t.length;) o(3, t.slice(0, 255)), t = t.slice(255);
				}
				t.kind === "solid3d" ? o(100, "AcDb3dSolid") : t.kind === "region" && o(100, "AcDbRegion");
				return;
			}
			case "viewport":
				Y("VIEWPORT", t, "AcDbViewport"), o(10, $(t.center.x)), o(20, $(t.center.y)), o(30, $(t.center.z ?? 0)), o(40, $(t.width)), o(41, $(t.height)), o(68, 1), o(69, t.id ?? 1), o(12, $(t.viewCenter?.x ?? 0)), o(22, $(t.viewCenter?.y ?? 0)), t.viewTarget && (o(17, $(t.viewTarget.x)), o(27, $(t.viewTarget.y)), o(37, $(t.viewTarget.z ?? 0))), t.viewDirection && (o(16, $(t.viewDirection.x)), o(26, $(t.viewDirection.y)), o(36, $(t.viewDirection.z ?? 0))), Q(t.twistAngle) && t.twistAngle !== 0 && o(51, $(t.twistAngle * Z)), Q(t.lensLength) && o(42, $(t.lensLength)), o(45, $(t.viewHeight ?? t.height)), o(90, t.statusFlag ?? 0);
				return;
			case "light":
				Y("POINT", t, "AcDbPoint"), o(10, $(t.position.x)), o(20, $(t.position.y)), o(30, $(t.position.z ?? 0));
				return;
			case "pointcloud": {
				let e = t.extentsMin, n = t.extentsMax;
				Y("LWPOLYLINE", t, "AcDbPolyline"), o(90, 4), o(70, 1), o(10, $(e.x)), o(20, $(e.y)), o(10, $(n.x)), o(20, $(e.y)), o(10, $(n.x)), o(20, $(n.y)), o(10, $(e.x)), o(20, $(n.y));
				return;
			}
			case "ole": {
				Y("OLE2FRAME", t, "AcDbOle2Frame"), o(70, 2), o(3, "OLE");
				let [e, , n] = t.corners;
				o(10, $(e.x)), o(20, $(e.y)), o(30, $(e.z ?? 0)), o(11, $(n.x)), o(21, $(n.y)), o(31, $(n.z ?? 0)), o(71, t.oleType), o(72, t.tileMode ?? 0), o(73, +!!t.lockAspect);
				let r = t.data ?? /* @__PURE__ */ new Uint8Array();
				o(90, r.length);
				for (let e = 0; e < r.length; e += 127) {
					let t = "";
					for (let n = e; n < Math.min(e + 127, r.length); n++) t += r[n].toString(16).padStart(2, "0").toUpperCase();
					o(310, t);
				}
				o(1, "OLE");
				return;
			}
			case "mleader":
				if (!C) {
					zn(t);
					return;
				}
				Vn(t);
				return;
			case "table": {
				let e = y.get(t);
				if (!e) {
					Rn(t, t.position.x, t.position.y);
					return;
				}
				Hn(t, e.name, e.rec);
				return;
			}
			case "proxy":
				if (!t.data && !t.graphicsData) {
					for (let e of t.graphics) Wn(e);
					return;
				}
				Y("ACAD_PROXY_ENTITY", t, "AcDbProxyEntity"), o(90, 498), o(91, Ut.get(It(t.appClass, t.sourceType, "ACAD_PROXY_ENTITY")) ?? 0), yn(t);
				return;
			case "unknown":
				if (t.tags?.length) {
					o(0, t.sourceType), Mn(t.tags, ot.get(t) ?? c(), J, {
						src: t.handle,
						reactors: t.reactors
					});
					return;
				}
				for (let e of t.graphics ?? []) Wn(e);
				return;
		}
	};
	o(0, "SECTION"), o(2, "BLOCKS");
	for (let e of ["*Model_Space", "*Paper_Space"]) {
		let t = ln(e);
		o(0, "BLOCK"), o(5, c()), o(330, t), o(100, "AcDbEntity"), o(8, "0"), o(100, "AcDbBlockBegin"), o(2, e), o(70, 0), o(10, 0), o(20, 0), o(30, 0), o(3, e), o(1, ""), o(0, "ENDBLK"), o(5, c()), o(330, t), o(100, "AcDbEntity"), o(8, "0"), o(100, "AcDbBlockEnd");
	}
	for (let e of d) {
		let t = l[e], n = t.basePoint ?? {
			x: 0,
			y: 0,
			z: 0
		}, r = F[e];
		o(0, "BLOCK"), o(5, c()), o(330, r), o(100, "AcDbEntity"), o(67, 1), o(8, "0"), o(100, "AcDbBlockBegin"), o(2, e), o(70, 0), o(10, $(n.x)), o(20, $(n.y)), o(30, $(n.z ?? 0)), o(3, e), o(1, ""), J = r, pn = !0, t.entities.forEach(Un), pn = !1, J = j, o(0, "ENDBLK"), o(5, c()), o(330, r), o(100, "AcDbEntity"), o(67, 1), o(8, "0"), o(100, "AcDbBlockEnd");
	}
	for (let t of w) {
		let n = l[t], r = n.basePoint ?? {
			x: 0,
			y: 0,
			z: 0
		}, i = F[t], a = n.xref;
		{
			let r = n.visibilityStates?.length ?? 0, i = n.parameters?.length ?? 0, a = n.actions?.length ?? 0;
			(r || i || a) && !Ot(t) && e.warnings.push(`dynamic block ${t}: ` + (r ? `${r} visibility state(s), ` : "") + `${i} parameter(s) and ${a} action(s) written static`);
		}
		o(0, "BLOCK"), o(5, c()), o(330, i), o(100, "AcDbEntity"), o(8, "0"), o(100, "AcDbBlockBegin"), o(2, re(t)), o(70, a ? 4 | (a.overlay ? 8 : 0) : 0), o(10, $(r.x)), o(20, $(r.y)), o(30, $(r.z ?? 0)), o(3, re(t)), o(1, a ? a.path : ""), a ? n.entities.length && e.warnings.push(n.entities.length + " entities inside xref block \"" + t + "\" skipped in DXF: an attachment's geometry lives in the referenced file.") : (J = i, n.entities.forEach(Un), J = j), o(0, "ENDBLK"), o(5, c()), o(330, i), o(100, "AcDbEntity"), o(8, "0"), o(100, "AcDbBlockEnd");
	}
	for (let [e, t] of y) o(0, "BLOCK"), o(5, c()), o(330, t.rec), o(100, "AcDbEntity"), o(8, "0"), o(100, "AcDbBlockBegin"), o(2, t.name), o(70, 1), o(10, 0), o(20, 0), o(30, 0), o(3, t.name), o(1, ""), J = t.rec, t.src ? t.src.entities.forEach(Un) : Rn(e, 0, 0), J = j, o(0, "ENDBLK"), o(5, c()), o(330, t.rec), o(100, "AcDbEntity"), o(8, "0"), o(100, "AcDbBlockEnd");
	o(0, "ENDSEC"), o(0, "SECTION"), o(2, "ENTITIES"), J = j, e.entities.forEach(Un), e.paperSpace && e.paperSpace.length && (J = M, pn = !0, e.paperSpace.forEach(Un), pn = !1, J = j), o(0, "ENDSEC");
	let Gn = e.groups ?? [], Kn = (e.xrecords ?? []).filter((e) => (e.name ?? "").toUpperCase() !== "ACDB_RECOMPOSE_DATA" && !(e.handle && Ye.has(i(e.handle)))), X = e.geoData;
	{
		o(0, "SECTION"), o(2, "OBJECTS");
		let e = ie.size ? c() : "", t = un.length ? c() : "", r = c(), a = I.length ? c() : "", s = X ? c() : "", l = /* @__PURE__ */ new Map();
		for (let e of De) l.set(e, c());
		let u = Gn.map(() => c()), d = ce, f = Kn.map((e) => h(e.handle)), p = (e) => e.type === "mtext" && !!e.xdata?.some((e) => e.values.some((e) => "value" in e && e.code === 1e3 && e.value === "ACAD_MTEXT_COLUMNS_BEGIN")), m = hn().filter((e) => p(e) || e.type === "table").map((e) => ot.get(e)).filter((e) => !!e).sort((e, t) => parseInt(e, 16) - parseInt(t, 16)), g = m.length ? c() : "", v = (e) => e.toUpperCase(), y = /* @__PURE__ */ new Map(), b = (e, t, n) => {
			t && y.set(e, {
				handle: t,
				keys: n
			});
		};
		b("ACAD_PLOTSTYLENAME", N, ["Normal"]), b("ACAD_GROUP", r, Gn.map((e) => e.name)), b("ACAD_LAYOUT", t, un.map(({ l: e }) => e.name)), b("ACAD_MLINESTYLE", a, I.map((e) => e.name)), b("ACDBVARIABLEDICTIONARY", nt, V.map((e) => e.name)), b("ACAD_TABLESTYLE", ye, L.map((e) => e.name)), b("ACAD_MLEADERSTYLE", xe, ve.map((e) => e.name)), b("ACAD_IMAGE_DICT", e, [...ie.keys()].map((e, t) => "ND_IMAGE_" + (t + 1)));
		for (let [e, t] of l) b("ACAD_" + e.toUpperCase() + "DEFINITIONS", t, [...Oe.values()].filter((t) => t.kind === e).map((t, n) => e.toUpperCase() + "_" + (n + 1)));
		let x = /* @__PURE__ */ new Map(), S = (e) => e.map(v).join("\0"), C = [], w = /* @__PURE__ */ new Map();
		for (let e of Ct) Le(e) && e.dictPath !== void 0 && e.name !== void 0 && w.set(S([...e.dictPath, e.name]), e);
		let ee = (e) => Le(e) && e.dictPath !== void 0 && e.name !== void 0 && w.get(S([...e.dictPath, e.name])) === e;
		x.set("", {
			path: [],
			handle: B,
			entries: [],
			keys: /* @__PURE__ */ new Set([
				...y.keys(),
				...s ? ["ACAD_GEOGRAPHICDATA"] : [],
				...je.map((e, t) => v(e.name ?? "PROXY_OBJECT_" + (t + 1))),
				...g ? ["ACDB_RECOMPOSE_DATA"] : []
			])
		});
		let T = (e) => {
			let t = S(e), n = x.get(t);
			if (n) return n;
			let r = T(e.slice(0, -1));
			if (!r) return null;
			let i = e[e.length - 1], a = e.length === 1 ? y.get(v(i)) : void 0, o;
			if (a) o = {
				path: e,
				handle: a.handle,
				keys: new Set(a.keys.map(v)),
				entries: []
			};
			else {
				if (r.keys.has(v(i)) && !r.sealed) return null;
				let n = w.get(t);
				o = {
					path: e,
					handle: n ? Tt.get(n) : c(),
					keys: /* @__PURE__ */ new Set(),
					entries: [],
					sealed: n
				}, r.entries.push([i, o.handle]), r.keys.add(v(i)), C.push(o);
			}
			return x.set(t, o), o;
		};
		for (let e of w.values()) T([...e.dictPath, e.name]);
		let E = (e, t, n) => e.keys.has(v(t)) && !e.sealed ? !1 : (e.keys.add(v(t)), e.entries.push([t, n]), !0), D = Ct.map((e, t) => {
			if (ee(e)) return "tree";
			let n = e.dictPath === void 0 ? null : T(e.dictPath), r = n ? E(n, e.name ?? "SEALED_OBJECT_" + (t + 1), wt[t]) : !1, i = _(e.ownerHandle);
			return i === void 0 ? n && r ? n.handle : null : i;
		}), te = je.map((e, t) => {
			let n = _(e.ownerHandle), r = n === void 0 ? void 0 : [...x.values()].find((e) => e.handle === n);
			return r && r.path.length ? (E(r, e.name ?? "PROXY_OBJECT_" + (t + 1), pt[t]), r.handle) : n !== void 0 && r === void 0 ? n : B;
		}), ne = x.get("").keys, re = Kn.map((e) => !e.name || ne.has(v(e.name)) ? !1 : (ne.add(v(e.name)), !0)), O = Kn.map((e, t) => t).filter((e) => !re[e]), k = O.length ? c() : "", A = (e) => {
			for (let [t, n] of x.get(S([e]))?.entries ?? []) o(3, t), o(350, n);
		};
		o(0, "DICTIONARY"), o(5, B), o(330, 0), o(100, "AcDbDictionary"), o(281, 1), o(3, "ACAD_PLOTSTYLENAME"), o(350, N), o(3, "ACAD_GROUP"), o(350, r), t && (o(3, "ACAD_LAYOUT"), o(350, t)), a && (o(3, "ACAD_MLINESTYLE"), o(350, a)), ye && (o(3, "ACAD_TABLESTYLE"), o(350, ye)), nt && (o(3, "AcDbVariableDictionary"), o(350, nt)), xe && (o(3, "ACAD_MLEADERSTYLE"), o(350, xe)), e && (o(3, "ACAD_IMAGE_DICT"), o(350, e)), s && (o(3, "ACAD_GEOGRAPHICDATA"), o(350, s));
		for (let [e, t] of l) o(3, "ACAD_" + e.toUpperCase() + "DEFINITIONS"), o(350, t);
		je.forEach((e, t) => {
			te[t] === B && (o(3, e.name ?? "PROXY_OBJECT_" + (t + 1)), o(350, pt[t]));
		});
		for (let [e, t] of x.get("")?.entries ?? []) o(3, e), o(350, t);
		g && (o(3, "ACDB_RECOMPOSE_DATA"), o(350, g)), Kn.forEach((e, t) => {
			re[t] && (o(3, e.name), o(350, f[t]));
		}), k && (o(3, "ND_XRECORDS"), o(350, k)), o(0, "ACDBDICTIONARYWDFLT"), o(5, N), o(330, B), o(100, "AcDbDictionary"), o(281, 1), o(3, "Normal"), o(350, P), A("ACAD_PLOTSTYLENAME"), o(100, "AcDbDictionaryWithDefault"), o(340, P), o(0, "ACDBPLACEHOLDER"), o(5, P), o(330, N), je.forEach((e, t) => {
			o(0, "ACAD_PROXY_OBJECT"), o(5, pt[t]), Pt(e.handle, void 0, pt[t]), o(330, te[t]), o(100, "AcDbProxyObject"), o(90, 499), o(91, Ut.get(It(e.appClass, e.sourceType, "ACAD_PROXY_OBJECT")) ?? 0), yn(e), jn(e);
		});
		let M = /* @__PURE__ */ new Set();
		for (let e of C) {
			let t = x.get(S(e.path.slice(0, -1)))?.handle ?? B;
			if (e.sealed) {
				let n = e.sealed.hardOwner ? 3 : 2, r = e.entries.map(([e, t]) => [
					e,
					t,
					n
				]);
				e.sealed.handle && r.push(...ht.get(i(e.sealed.handle)) ?? []), Nn(e.sealed, e.handle, t, r);
			} else {
				o(0, "DICTIONARY"), o(5, e.handle), o(330, t), o(100, "AcDbDictionary"), o(281, 1);
				for (let [t, n] of e.entries) o(3, t), o(350, n);
			}
			M.add(e.handle);
		}
		{
			let e = /* @__PURE__ */ new Map(), t = [];
			for (let n of Ct) {
				let r = n.ownerHandle ? Ye.get(i(n.ownerHandle)) : void 0;
				if (r && r !== n && vt.has(r)) {
					let t = i(n.ownerHandle), r = e.get(t) ?? [];
					r.push(n), e.set(t, r);
				} else t.push(n);
			}
			let n = [], r = /* @__PURE__ */ new Set(), a = (t) => {
				if (!r.has(t) && (r.add(t), n.push(t), t.handle)) for (let n of e.get(i(t.handle)) ?? []) a(n);
			};
			t.forEach(a), Ct.forEach(a);
			let s = /* @__PURE__ */ new Map();
			Ct.forEach((e, t) => s.set(e, t));
			for (let e of n) {
				let t = s.get(e), n = D[t];
				if (!n || n === "tree") continue;
				let r = wt[t], a = e.ownerHandle ? Ye.get(i(e.ownerHandle)) : void 0;
				if (!(a && a !== e && vt.has(a) && !M.has(Tt.get(a) ?? ""))) {
					if (Re(e)) Nn(e, r, n, e.handle ? ht.get(i(e.handle)) ?? [] : []);
					else if (Be(e)) o(0, e.sourceType), Mn(e.tags, r, n, {
						src: e.handle,
						reactors: e.reactors
					});
					else if (Ge(e)) Fn(e, r, n);
					else {
						let t = He(e);
						if (!t) continue;
						Pn(t, r, n, e);
					}
					M.add(r);
				}
			}
		}
		for (let e of mt) {
			e.sealedDict || (o(0, "DICTIONARY"), o(5, e.dict), o(330, e.block), o(100, "AcDbDictionary"), o(280, 1), o(281, 1), o(3, "ACAD_SORTENTS"), o(360, e.table)), o(0, "SORTENTSTABLE"), o(5, e.table), o(102, "{ACAD_REACTORS"), o(330, e.dict), o(102, "}"), o(330, e.dict), o(100, "AcDbSortentsTable"), o(330, e.block);
			for (let [t, n] of e.pairs) o(331, t), o(5, n);
		}
		for (let [e, t] of l) {
			let n = [...Oe.values()].filter((t) => t.kind === e);
			o(0, "DICTIONARY"), o(5, t), o(330, B), o(100, "AcDbDictionary"), o(281, 1), n.forEach((t, n) => {
				o(3, e.toUpperCase() + "_" + (n + 1)), o(350, t.handle);
			}), A("ACAD_" + e.toUpperCase() + "DEFINITIONS");
			for (let r of n) o(0, e.toUpperCase() + "DEFINITION"), o(5, r.handle), o(330, t), o(100, "AcDbUnderlayDefinition"), o(1, r.path), o(2, r.itemName);
		}
		if (X) {
			o(0, "GEODATA"), o(5, s), o(330, B), o(100, "AcDbGeoData"), o(90, X.version ?? 3), o(330, j), o(70, X.coordinatesType ?? 0), o(10, $(X.designPoint.x)), o(20, $(X.designPoint.y)), o(30, $(X.designPoint.z ?? 0)), o(11, $(X.referencePoint.x)), o(21, $(X.referencePoint.y)), o(31, $(X.referencePoint.z ?? 0)), o(40, $(X.horizontalUnitScale ?? 1)), o(91, X.horizontalUnits ?? 1), o(41, $(X.verticalUnitScale ?? X.horizontalUnitScale ?? 1)), o(92, X.verticalUnits ?? X.horizontalUnits ?? 1);
			let e = X.upDirection ?? {
				x: 0,
				y: 0,
				z: 1
			};
			o(210, $(e.x)), o(220, $(e.y)), o(230, $(e.z ?? 1));
			let t = X.northDirection ?? {
				x: 0,
				y: 1
			};
			o(12, $(t.x)), o(22, $(t.y)), o(95, X.scaleEstimation ?? 1), o(141, $(X.userScaleFactor ?? 1)), o(294, +!!X.seaLevelCorrection), o(142, $(X.seaLevelElevation ?? 0)), o(143, $(X.projectionRadius ?? 0));
			let n = (X.coordinateSystem ?? "").replace(/\r?\n/g, "^J"), r = [];
			for (let e = 0; e < n.length; e += 255) r.push(n.slice(e, e + 255));
			r.length || r.push("");
			for (let e = 0; e < r.length - 1; e++) o(303, r[e]);
			o(301, r[r.length - 1]), o(302, X.geoRssTag ?? (X.latitude === void 0 ? "" : `<georss:point>${X.latitude} ${X.longitude ?? 0}</georss:point>`)), o(305, ""), o(306, ""), o(307, ""), o(93, 0), o(96, 0);
		}
		if (t && (o(0, "DICTIONARY"), o(5, t), o(330, B), o(100, "AcDbDictionary"), o(281, 1), un.forEach(({ l: e, h: t }) => {
			o(3, e.name), o(350, t);
		}), A("ACAD_LAYOUT"), un.forEach(({ l: e, h: n, brh: r }, i) => {
			o(0, "LAYOUT"), o(5, n), Pt(e.handle, void 0, n), o(330, t), o(100, "AcDbPlotSettings"), o(1, ""), o(2, e.paperSize ?? "none_device"), o(4, ""), o(6, ""), o(7, e.plotStyleSheet ?? ""), o(70, 688), o(72, 0), o(73, 0), o(74, 0), o(75, 0), o(100, "AcDbLayout"), o(1, e.name), o(70, 1), o(71, e.tabOrder ?? i), o(10, $(e.limMin?.x ?? 0)), o(20, $(e.limMin?.y ?? 0)), o(11, $(e.limMax?.x ?? 0)), o(21, $(e.limMax?.y ?? 0)), o(12, $(e.insBase?.x ?? 0)), o(22, $(e.insBase?.y ?? 0)), o(32, $(e.insBase?.z ?? 0)), e.extMin && (o(14, $(e.extMin.x)), o(24, $(e.extMin.y)), o(34, $(e.extMin.z ?? 0))), e.extMax && (o(15, $(e.extMax.x)), o(25, $(e.extMax.y)), o(35, $(e.extMax.z ?? 0))), o(330, r);
		})), o(0, "DICTIONARY"), o(5, r), o(330, B), o(100, "AcDbDictionary"), o(281, 1), Gn.forEach((e, t) => {
			o(3, e.name), o(350, u[t]);
		}), A("ACAD_GROUP"), Gn.forEach((e, t) => {
			o(0, "GROUP"), o(5, u[t]), o(330, r), o(100, "AcDbGroup"), o(300, e.description ?? ""), o(70, +!!e.name.startsWith("*")), o(71, e.selectable === !1 ? 0 : 1);
			for (let t of e.entityHandles) {
				let e = _(t);
				e && o(340, e);
			}
		}), a) {
			o(0, "DICTIONARY"), o(5, a), o(330, B), o(100, "AcDbDictionary"), o(281, 1), I.forEach((e, t) => {
				o(3, e.name), o(350, d[t]);
			}), A("ACAD_MLINESTYLE");
			let e = (e, t) => e?.kind === "aci" ? e.index : e?.kind === "rgb" ? n(e.rgb) : t;
			I.forEach((t, n) => {
				let r = t.handle;
				o(0, "MLINESTYLE"), o(5, d[n]), Pt(r, void 0, d[n]), o(330, a), o(100, "AcDbMlineStyle"), o(2, t.name), o(70, t.flags ?? 0), o(3, t.description ?? ""), o(62, e(t.fillColor, 256)), o(51, $((t.startAngle ?? Math.PI / 2) * Z)), o(52, $((t.endAngle ?? Math.PI / 2) * Z)), o(71, t.elements.length);
				for (let n of t.elements) o(49, $(n.offset)), o(62, n.color.kind === "byBlock" ? 0 : e(n.color, 256)), o(6, n.linetype ?? "BYLAYER");
			});
		}
		if (nt && (o(0, "DICTIONARY"), o(5, nt), Pt(tt, void 0, nt), o(330, B), o(100, "AcDbDictionary"), o(281, 1), V.forEach((e, t) => {
			o(3, e.name), o(350, et[t]);
		}), A("ACDBVARIABLEDICTIONARY"), V.forEach((e, t) => {
			o(0, "DICTIONARYVAR"), o(5, et[t]), Pt(e.handle, void 0, et[t]), o(102, "{ACAD_REACTORS"), o(330, nt), o(102, "}"), o(330, nt), o(100, "DictionaryVariables"), o(280, e.schema ?? 0), o(1, e.value);
		})), ye) {
			o(0, "DICTIONARY"), o(5, ye), o(330, B), o(100, "AcDbDictionary"), o(281, 1), L.forEach((e, t) => {
				o(3, e.name), o(350, be[t]);
			}), A("ACAD_TABLESTYLE");
			let e = (e, t) => e ? e.kind === "byBlock" ? 0 : e.kind === "byLayer" ? 256 : e.kind === "rgb" ? n(e.rgb) : e.index : t, t = (e, t, n) => ({
				textHeight: t,
				alignment: n,
				...e
			}), r = (e) => e && de.has(e.toLowerCase()) ? e : de.has("standard") ? "Standard" : ft[0].name;
			L.forEach((n, i) => {
				o(0, "TABLESTYLE"), o(5, be[i]), o(330, ye), o(100, "AcDbTableStyle"), o(3, n.description ?? n.name), o(70, n.flowDirection ?? 0), o(71, n.flags ?? 0), o(40, $(n.horizontalMargin ?? .06)), o(41, $(n.verticalMargin ?? .06)), o(280, +!!n.titleSuppressed), o(281, +!!n.headerSuppressed);
				let a = [
					t(n.data, .18, 2),
					t(n.title, .25, 5),
					t(n.header, .18, 5)
				];
				for (let t of a) {
					o(7, r(t.textStyle)), o(140, $(t.textHeight ?? .18)), o(170, t.alignment ?? 5), o(62, e(t.textColor, 0)), o(63, e(t.fillColor, 7)), o(283, +!!t.fillOn);
					for (let n = 0; n < 6; n++) {
						let r = t.borders?.[n] ?? {};
						o(274 + n, r.lineweight ?? -2), o(284 + n, r.visible === !1 ? 0 : 1), o(64 + n, e(r.color, 0));
					}
				}
				jn(n);
			});
		}
		if (xe) {
			o(0, "DICTIONARY"), o(5, xe), o(330, B), o(100, "AcDbDictionary"), o(281, 1), ve.forEach((e, t) => {
				o(3, e.name), o(350, R[t]);
			}), A("ACAD_MLEADERSTYLE");
			let e = (e) => (!e || e.kind === "byBlock" ? 3238002688 : e.kind === "byLayer" ? 3221225472 : e.kind === "rgb" ? 3254779904 | e.rgb & 16777215 : 3271557120 | e.index & 255) | 0;
			ve.forEach((t, n) => {
				o(0, "MLEADERSTYLE"), o(5, R[n]), o(330, xe), o(100, "AcDbMLeaderStyle"), o(170, t.contentType ?? 2), o(171, t.drawMLeaderOrder ?? 1), o(172, t.drawLeaderOrder ?? 0), o(90, t.maxLeaderPoints ?? 2), o(40, $(t.firstSegmentAngle ?? 0)), o(41, $(t.secondSegmentAngle ?? 0)), o(173, t.leaderType ?? 1), o(91, e(t.lineColor)), o(340, t.linetype && fe.get(t.linetype.toLowerCase()) || fe.get("byblock") || "0"), o(92, t.lineweight ?? -2), o(290, t.landing === !1 ? 0 : 1), o(42, $(t.landingGap ?? .09)), o(291, t.dogleg === !1 ? 0 : 1), o(43, $(t.doglegLength ?? .36)), o(3, t.description ?? t.name);
				let r = t.arrowBlock ? F[t.arrowBlock] : void 0;
				r && o(341, r), o(44, $(t.arrowSize ?? .18)), o(300, t.defaultText ?? ""), o(342, In(t.textStyle)), o(174, t.textLeftAttachment ?? 1), o(178, t.textRightAttachment ?? 1), o(175, t.textAngleType ?? 1), o(176, t.textAlignment ?? 0), o(93, e(t.textColor)), o(45, $(t.textHeight ?? .18)), o(292, +!!t.textFrame), o(297, +!!t.alwaysAlignLeft), o(46, $(t.alignSpace ?? .18));
				let i = t.blockName ? F[t.blockName] : void 0;
				i && o(343, i), o(94, e(t.blockColor));
				let a = t.blockScale ?? {
					x: 1,
					y: 1,
					z: 1
				};
				o(47, $(a.x)), o(49, $(a.y)), o(140, $(a.z ?? 1)), o(293, t.useBlockScale === !1 ? 0 : 1), o(141, $(t.blockRotation ?? 0)), o(294, t.useBlockRotation === !1 ? 0 : 1), o(177, t.blockConnection ?? 0), o(142, $(t.scale ?? 1)), o(295, +!!t.propertyChanged), o(296, +!!t.annotative), o(143, $(t.breakSize ?? .125));
				let s = (t.xdata ?? []).filter((e) => e.appName !== "ACAD_MLEADERVER");
				s.length && jn({ xdata: s }), o(1001, "ACAD_MLEADERVER"), o(1070, 2);
			});
		}
		if (g) {
			o(0, "XRECORD"), o(5, g), o(330, B), o(100, "AcDbXrecord"), o(280, 1), o(90, 1);
			for (let e of m) o(330, e);
		}
		if (Kn.forEach((e, t) => {
			re[t] && Pn(e, f[t], B);
		}), k) {
			o(0, "DICTIONARY"), o(5, k), o(330, B), o(100, "AcDbDictionary"), o(281, 1);
			let e = /* @__PURE__ */ new Set();
			for (let t of O) {
				let n = Kn[t].name ?? "ND_XRECORD_" + (t + 1), r = n;
				for (let t = 2; e.has(r.toUpperCase()); t++) r = `${n}~${t}`;
				e.add(r.toUpperCase()), o(3, r), o(350, f[t]);
			}
			for (let e of O) Pn(Kn[e], f[e], k);
		}
		if (e) {
			o(0, "DICTIONARY"), o(5, e), o(330, B), o(100, "AcDbDictionary"), o(281, 1);
			let t = 0;
			for (let [, e] of ie) o(3, "ND_IMAGE_" + ++t), o(350, e.handle);
			A("ACAD_IMAGE_DICT");
			for (let [t, n] of ie) {
				let r = t.slice(0, t.lastIndexOf("|"));
				o(0, "IMAGEDEF"), o(5, n.handle), o(330, e), o(100, "AcDbRasterImageDef"), o(90, 0), o(1, r), o(10, $(n.w)), o(20, $(n.h)), o(11, 1), o(21, 1), o(280, 1), o(281, 0);
			}
		}
		o(0, "ENDSEC");
	}
	return o(0, "EOF"), a[K] = s.toString(16).toUpperCase(), a.join("\n") + "\n";
};
//#endregion
export { Yn as readDwg, mr as writeDxf };
