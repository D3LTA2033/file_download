// DISCLAIMER: Selfbots are against Discord's Terms of Service. This code is for educational purposes only. Do NOT use on real Discord accounts.

const { Client } = require('discord.js-selfbot-v13');
const readline = require('readline');

const TOKEN = 'MTQxOTQxNzU1MDk1Mjg2MTc1Nw.GfJI8S.SLGVafuw4iE8QAzRZOe6-jhqX_35hJba2j516Y';

// Create the Discord client
const client = new Client({
    checkUpdate: false,
    ws: { properties: { $browser: "Discord iOS" } }
});

// Track advertising/spam status per guild in a Map
const adTasks = new Map();

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

async function mainInteractiveAd() {
    if (!client.readyAt) {
        console.log('Client is not ready yet.');
        setTimeout(mainInteractiveAd, 2000);
        return;
    }

    const guilds = Array.from(client.guilds.cache.values())
        .filter(g => g && g.available)
        .sort((a, b) => a.name.localeCompare(b.name));
    if (!guilds.length) {
        console.log('❌ No servers available.');
        return;
    }
    console.log('\n=== Servers ===');
    guilds.forEach((g, i) => {
        let status = '';
        try {
            if (!g.me) status = ' (no member)';
            else if (!(g.me.permissions && g.me.permissions.has('VIEW_CHANNEL'))) status = ' (no channel view perms)';
        } catch {}
        console.log(`${i + 1}. ${g.name}${status}`);
    });

    let rawSrvIdx = await askQuestion('Which server? (number): ');
    let srvIdx = parseInt(rawSrvIdx.trim(), 10) - 1;
    if (isNaN(srvIdx) || srvIdx < 0 || srvIdx >= guilds.length) {
        console.log('❌ Invalid server number.');
        return;
    }
    const guild = guilds[srvIdx];

    // Fetch and show text channels that the USER can send messages in
    let me;
    try {
        me = guild.me || guild.members.cache.get(client.user.id);
    } catch {
        me = undefined;
    }
    if (!me) {
        console.log("❌ Cannot find your membership in this server. Are you in this guild as a user?");
        return;
    }

    let channels = Array.from(guild.channels.cache.values())
        .filter(ch => (
            (ch.type === 'GUILD_TEXT' || ch.type === 0) &&
            ch.viewable &&
            typeof ch.send === "function" &&
            (!ch.permissionOverwrites || me.permissionsIn(ch).has('SEND_MESSAGES'))
        ))
        .sort((a, b) => a.position - b.position);

    if (!channels.length) {
        console.log('❌ No text channels found or you do not have send permission in any.');
        return;
    }

    console.log(`\n=== Channels in '${guild.name}' ===`);
    channels.forEach((ch, i) => {
        let canSend = false;
        try {
            canSend = me.permissionsIn(ch).has('SEND_MESSAGES');
        } catch {}
        console.log(`${i + 1}. #${ch.name}${canSend ? '' : ' (no send perms)'}`);
    });
    let rawChIdx = await askQuestion('Which channel? (number): ');
    let chIdx = parseInt(rawChIdx.trim(), 10) - 1;
    if (isNaN(chIdx) || chIdx < 0 || chIdx >= channels.length) {
        console.log('❌ Invalid channel number.');
        return;
    }
    const channel = channels[chIdx];

    // Check for send permission in chosen channel
    let canActuallySend = false;
    try {
        canActuallySend = me.permissionsIn(channel).has('SEND_MESSAGES');
    } catch {}
    if (!canActuallySend) {
        console.log("❌ You do not have permission to send messages in this channel.");
        return;
    }
    if (typeof channel.send !== 'function') {
        console.log('❌ Selected channel is not text or cannot send messages.');
        return;
    }

    // adTasks to prevent double execution and track stats
    if (!adTasks.has(guild.id)) {
        adTasks.set(guild.id, {
            running: false,
            allUsers: [],
            success: 0,
            failed: 0,
            finished: false
        });
    }
    let adTask = adTasks.get(guild.id);

    if (adTask.running) {
        console.log("❗ There's already a spam task running in this server.");
        return;
    }

    console.log('Fetching all server members (excluding bots and yourself) ...');
    try {
        // Much faster: access only cached members and skip force fetching all profiles for big servers
        let allMembers = [];
        let useCacheOnly = false;

        // Strategy: For small servers (<2000), attempt full fetch. Otherwise, just use cache for speed.
        if (guild.memberCount <= 2000) {
            try {
                await guild.members.fetch({ force: true });
                allMembers = guild.members.cache
                    .filter(m => m.user && !m.user.bot && m.user.id !== client.user.id)
                    .map(m => m.user);
            } catch (err) {
                useCacheOnly = true;
            }
        } else {
            useCacheOnly = true;
        }

        if (useCacheOnly) {
            if (guild.memberCount > 1000) {
                console.log("⚡ Guild is large, using cached members for speed (some members may be missing).");
            } else {
                console.log("⚠️ Could not fetch all members. Using cached members only.");
            }
            allMembers = guild.members.cache
                .filter(m => m.user && !m.user.bot && m.user.id !== client.user.id)
                .map(m => m.user);
        }

        if (allMembers.length === 0) {
            console.log("❌ Could not retrieve any users (try on smaller servers or with better permissions).");
            adTask.running = false;
            adTask.finished = true;
            adTasks.set(guild.id, adTask);
            return;
        }

        // Output every user we fetched for visibility as requested
        console.log(`🔍 Found ${allMembers.length} users (not bots, not yourself):`);
        for (let u of allMembers) {
            console.log(`- ${u.tag} (${u.id})`);
        }

        adTask.allUsers = allMembers;
        adTask.success = 0;
        adTask.failed = 0;
        adTask.running = true;
        adTask.finished = false;

        if (allMembers.length === 0) {
            console.log(`ℹ️ No users to ping.`);
            adTask.running = false;
            adTask.finished = true;
            adTasks.set(guild.id, adTask);
            return;
        }

        // Batch send pings (max 45 per message)
        const MAX_PINGS_PER_MESSAGE = 45;
        const userChunks = [];
        for (let i = 0; i < allMembers.length; i += MAX_PINGS_PER_MESSAGE) {
            userChunks.push(allMembers.slice(i, i + MAX_PINGS_PER_MESSAGE));
        }

        for (let batchIdx = 0; batchIdx < userChunks.length; batchIdx++) {
            if (!adTask.running) break;
            const userChunk = userChunks[batchIdx];
            const mentionString = userChunk.map(u => `<@${u.id}>`).join(' ');
            let text = `${mentionString}\n# join /psz & ranking now or go to https://botcord-discord.netlify.app https://discord.gg/HM4dnPeSaS https://discord.gg/grG9ekqKCt`;

            try {
                await channel.send(text);
                adTask.success += userChunk.length;
                console.log(`✅ Sent batch ${batchIdx+1}/${userChunks.length} (${userChunk.length} users)`);
            } catch (e) {
                adTask.failed += userChunk.length;
                console.log(`❌ Error sending batch ${batchIdx+1}: ${e.message}`);
                await new Promise(res => setTimeout(res, 2500));
            }

            if (batchIdx !== userChunks.length - 1) {
                await new Promise(res => setTimeout(res, 3000));
            }
        }

        adTask.running = false;
        adTask.finished = true;
        adTasks.set(guild.id, adTask);

        let total = adTask.allUsers ? adTask.allUsers.length : 0;
        let msg = `\n📊 Stat Report:\n- Detected Users: ${total}\n- Pinged: ${adTask.success}\n- Failed: ${adTask.failed}\n`;
        console.log(msg);

        adTasks.set(guild.id, {
            running: false,
            allUsers: [],
            success: 0,
            failed: 0,
            finished: false
        });

    } catch (err) {
        console.log('❌ Failed to fetch server members.');
        console.error(err);
        return;
    }
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user ? client.user.tag : 'unknown user'}`);
    mainInteractiveAd();
});

client.on('error', err => {
    console.error('Client Error:', err);
});

client.login(TOKEN).catch(err => {
    console.error("Login failed:", err.message || err);
});

