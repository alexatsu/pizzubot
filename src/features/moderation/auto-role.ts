import { Events } from 'discord.js'

import { Roles } from '@/features/moderation/config'
import { client } from '@/shared/config/client'

export function autoRoleEvent() {
    client.on(Events.GuildMemberAdd, async member => {
        try {
            const role = member.guild.roles.cache.get(Roles.Member)

            if (!role) {
                console.error(`Role with ID ${Roles.Member} not found`)
                return
            }

            await member.roles.add(role)
            console.log(`Assigned ${role.name} role to ${member.user.tag}`)
        } catch (error) {
            console.error('Error assigning role:', error)
        }
    })
}
