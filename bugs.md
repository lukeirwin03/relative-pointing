## BUGS

[x] If you share the link, it allows people to join the session without having a name - we probably need to have some sort of join link that prompts people to add a name or something when they join the session via the link. - we also want to do some sort of local store with a cookie or something so if someone leaves the session or closes their tab, they can join the session again as the same user so the admin doesnt have to remove the user

[x] putting a card between two columns appends it to the end column (furthest right) - always creates a new column - sometimes cards just disappear ???? - appears to be resolved with the migration to vite frontend - between-column ordering now correctly calculates midpoint

[x] Cards need to have a unique id so that there aren't duplicates - if duplicate id the cards will move together when you drag it

[ ] unique id's not working, should be issue key - can have several issues with the same key
