const fs = require('fs')
const Discord = require('discord.js')
const config = require('./config.json')
const token = config.keys.token
const prefix = config.prefix
const client = new Discord.Client()

const util = require('./util/util')
//False = admins are not effected by cooldowns
const adminCD = false

//get commands
client.commands = new Discord.Collection()
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))

for (const file of commandFiles) {
    const command = require(`./commands/${file}`)
    client.commands.set(command.name, command)
}

//Command Cooldown
const cooldowns = new Discord.Collection()

//On Bot Login
client.once('ready', () => {
    console.log('\nOnline')
})

//On Message
client.on('message', message => {
    if (!message.content.startsWith(prefix) || message.author.bot)
        return

    const args = message.content.slice(prefix.length).split(/ +/)
    const commandName = args.shift().toLowerCase()

    //Check if user places another prefix IE: '??'
    if (commandName.startsWith(prefix)) {
        console.log('command name starts with prefix\n' + commandName)
        return
    }

    //Get command
    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))
    if (!command) {
        console.log('could not find command ' + commandName)
        return;
    }

    //Check if command needs arguments
    if (command.args && !args.length) {
        return message.reply(util.args(command))
    }

    //Check if guild only
    if (command.guildOnly && message.channel.type !== 'text') {
        message.reply('That command cannot be used inside of dm\'s')
        return
    }

    //Get command perms
    const perms = command.perms
    let hasPerm = false

    if (perms) {
        hasPerm = util.execute(perms, message.author.id)
    }
    else if (!perms) {
        hasPerm = true
    }

    if (!hasPerm) {
        message.channel.send('You dont have permission to use this command')
        return
    }

    //Cooldowns
    if (!cooldowns.has(command.name)) {

        //Check if cooldowns has the commend, if not then add it in
        cooldowns.set(command.name, new Discord.Collection())
    }

    const now = Date.now()
    const timestamps = cooldowns.get(command.name)

    //get cooldown amount, if none set it to 3 seconds by default
    const cooldownAmount = (command.cooldown || 3) * 1000

    const noCD = (message.author.id === config.users.kira && !adminCD)

    if (timestamps.has(message.author.id) && !noCD) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount

        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000
            return message.reply(`Command on cooldown. Cooldown: ${timeLeft.toFixed(1)} second(s)`)
        }
    }
    else if (!noCD) {
        timestamps.set(message.author.id, now)
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount)
    }

    //Try to execute command
    try {
        command.execute(message, args)
    }
    catch (error) {
        console.error(error)
        message.reply('error trying to call command')
    }
})

//bot login
client.login(token)