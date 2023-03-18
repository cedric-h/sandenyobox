# map
 - simplex noise trees
 - decrease in circle around origin
 - origin has portal

# gameplay
 - place turrets
 - in the top right:
   - next enemy wave (ETA, short description)
   - next vendor (ETA, short description)
 - clear trees from map (axe tied up until tree cleared)
 - vendors sell screws and other items


# turret varieties

 - portal (takes damage, game over if 0)  
   configurable: position  
   costs: N/A  

 - pole/wall (reroutes enemies)  
   configurable: position, connection to other nearby poles  
   costs: mid wood, low screws  

 - piston (periodically stabs in a set direction)  
   configurable: position, angle  
   costs: high wood, low screws  

 - swinger (moves between angles)  
   configurable: position, start angle, end angle  
   costs: high wood, mid screws  

 - blaster (periodically shoots in a set direction)  
   configurable: position, angle  
   costs: high wood, high screws  

 - turret (aims itself and shoots)  
   configurable: position  
   costs: high wood, high screws, targeting computer  


# enemies
killer robots  
spawn at trees on outskirts of camp  
pathfind to portal, breaking walls only if necessary  
vary in speed and durability  
killing an enemy yields vendor currency  

formations:
 - scout (one quick low hp unit, pause, long train of slow mid hp units)  
 - trickle (space between them sine wave)  
 - fibonnaci (group of 1, then group of 1, then group of 2 ... durability inversely proportional to size of group?)  

# items

- wood (acquired via axe + tree + time, used to make turrets)  
- screws (sold by vendors, used to make turrets)  
- targeting computer (sold by vendors, used to make most advanced turret)  

### all sold by vendors
- axe (allows player to remove more trees simultaneously)  
- flare (moves up timers: vendor arrives immediately, next wave happens subsequently)  
- airstrike (immediately removes enemies and trees in a player-selected area)   
- big book of bargains (all vendors now sell bulk packages)  

# vendors

### screwball
rumored to be an axe murderer  
 - x5 screw (5gp) (stock: 3 to 5)
 - x1 axe (50gp) (stock: 1)
 - x1 flare (75gp) (stock: 1) (10% chance)
 - x1 airstrike (50gp) (stock: 1) ( 5% chance)
 - IF YOU DON'T GOT THE BBoB:
   - n/a
 - ELSE, CUZ YA DO:
   - x50 screw (25gp) (stock: 2)

### the survivalist
he's eaten some things he probably shouldn't have
 - x1 axe (40gp)
 - EITHER OR:
  - x1 flare (50gp) (stock: 1)
  - x1 airstrike (60gp) (stock: 1)
 - x1 targeting computer (40gp) (stock: 1 to 2) (10%)
 - IF YOU DON'T ALREADY GOT IT:
   - x1 big book of bargains (100gp) (stock: 1) ( 5%)
 - ELSE, CUZ YA DO:
   - x3 axe (100 gp) (stock: 1)
   - x1 targeting computer (40gp) (stock: 1)

### the tinkerer
he's sorry about the all the killer robots
 - x20 screw (14gp) (stock: 3 to 5)
 - x1 airstrike (50gp) (stock: 1) (50% chance)
 - x1 targeting computer (40gp) (stock: 1)
 - IF YOU DON'T ALREADY GOT IT:
   - x1 big book of bargains (100gp) (stock: 1 to 2) ( 6%)
 - ELSE, CUZ YA DO:
   - x100 screw (40gp) (stock: 2)
   - x3 airstrike (100 gp) (stock: 1)

## vendor sequence
first screwball, then survivalist, then 50% either for 2 rounds, then even split any of the 3
