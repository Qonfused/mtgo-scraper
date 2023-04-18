import chalk from 'chalk';

export const setDelay = ms => new Promise(res => setTimeout(res, ms));

export const findGoldfishEvent = async (
        page,
        format, type, uid,
        event, progress,
        eventLength, queueLength
    ) => {
    try {
        const _uid = `${format}-${type.replaceAll(' ', '-')}-${uid}`;
        await page.goto(`https://www.mtggoldfish.com/tournament/${_uid}`, { waitUntil: 'domcontentloaded' },);

        let archetypes = await page.evaluate(() => {
            return Array.from(
                document.querySelectorAll('div.deck-display-right-contents table.table:nth-child(2) tr td a[href]')
            ).map(a => {
                if (a == null || !a?.innerText) return;
                if (a.innerText == 'Total' || a.innerText == 'Other') return;
                return {
                    uid: parseInt(a.getAttribute('href').split('/archetype/')[1]),
                    displayName: a.innerText,
                };
            }).filter(Boolean);
        });

        if (archetypes.length == 0) return;

        let players = await page.evaluate((uid) => {
            return Array.from(
                document.querySelectorAll('div.deck-display-left-contents table.table-tournament tr td a[href]')
            ).reduce((a, b, i, array) => {
                if (i % 3 === 0)
                    a.push(array.slice(i, i + 2));
                    return a;
            }, []).map(p => {
                if (p[0].innerText == 'Other') return;
                return {
                    event_uid: uid,
                    player: p[1].innerText,
                    deck_uid: parseInt(p[0].getAttribute('href').split('/deck/')[1])
                };
            }).filter(Boolean);
        }, uid);

        await setDelay(1000);
        for (let i = 0; i < players?.length; i++) {
            const _progress = `${(((progress + i + 2) / (queueLength + eventLength))*100).toFixed(2)}%`;

            // Clear console
            process.stdout.write('\x1Bc');
            console.log(`Scraping ${_uid}... (${event}/${eventLength})`)

            // Get uptime in nearest days, hours, minutes and seconds
            let totalSeconds = ((queueLength + eventLength) - (progress + i + 2)) * 2;
            let days = Math.floor(totalSeconds / 86400).toFixed(0);
            let hours = Math.floor(totalSeconds / 3600).toFixed(0);
    
            totalSeconds %= 3600;
    
            let minutes = Math.floor(totalSeconds / 60).toFixed(0);
            let seconds = (totalSeconds % 60).toFixed(0);
    
            // Create array of these values to later filter out null values
            let formattedArray = totalSeconds.toFixed(0) == 0 ? ['', '', '', '0 seconds'] : [
                days > 0 ? `${ days } ${ (days == 1 ? 'day' : 'days') }` : ``,
                hours > 0 ? `${ hours } ${ (hours == 1 ? 'hour' : 'hours') }` : ``,
                minutes > 0 ? `${ minutes } ${ (minutes == 1 ? 'minute' : 'minutes') }` : ``,
                seconds > 0 ? `${ seconds } ${ (seconds == 1 ? 'second' : 'seconds') }` : ``,
            ];
    
            let t = 0;
            const timeRemaining = formattedArray
                .filter(Boolean)
                .join(', ')
                // Replace last comma with ' and' for fluency
                .replace(/, ([^,]*)$/, ' and $1');

            console.log(`${chalk.yellow(`Progress: ${(progress + i + 2)}/${(queueLength + eventLength)}`)} (${_progress} complete).`);
            console.log(`${timeRemaining} remaining.\n`);

            await page.goto(
                `https://www.mtggoldfish.com/deck/${players[i].deck_uid}`,
                { waitUntil: 'domcontentloaded' },
            );
            const deck = await page.evaluate(() => {
                const archetype = document.querySelector('.deck-container-information > a:nth-child(8)')?.innerText;
                const displayName = document.querySelector('h1.title')?.childNodes[0]?.nodeValue.replaceAll('\n', '');
                return {
                    archetype: archetype,
                    displayName: displayName,
                };
            });
            let archetype = archetypes.find(obj => obj.displayName == deck.archetype);
            if (!archetype) archetype = { uid: null, displayName: null };
            players[i] = {
                ...players[i],
                displayName: deck.displayName,
                alias: (deck.displayName !== archetype.displayName) ? [archetype.displayName] : [],
                archetype_uid: archetype.uid,
            };
            await setDelay(1000);
        }

        return players;
        
    } catch (error) {
        console.error(chalk.red(`${format}-${type}-${uid} - ${error.stack}`));
    }
}