const dtFactor = 0.01;
const CANVAS_DIM = 500;


function getRandomCord() {
  return Math.max(50,Math.random() * (CANVAS_DIM - 50));
}

function distance(s1, s2) {
  return Math.sqrt(Math.pow(s1.x - s2.x, 2) + Math.pow(s1.y - s2.y, 2));
}

function getNormalizedDirecton(s1, s2) {
  let y = s1.y - s2.y;
  let x = s1.x - s2.x;

  let length = Math.sqrt(Math.pow(y, 2) + Math.pow(x, 2));
  if (length == 0) {
    return { x: 1, y: 1 };
  }
  return { x: x / length, y: y / length };
}

class CombatEntity {
  constructor(team = 'A',x = getRandomCord() ,y = getRandomCord(), hp = 100,attack = 10 ,speed = 5 ,attackSpeed = 1 ) {
    this.team = team;
    this.x = x;
    this.y = y;
    this.active = true;
    this.hp = hp
    this.timeFromLastAttack = 1000;
    this.attack = attack;
    this.speed = speed
    this.attackSpeed = attackSpeed;
  }



}


class Missile {
    constructor(target,x = 0,y = 0,power = 10) {
      this.x = x;
      this.y = y;
      this.target = target;

      this.baseSpeed = 15;
      this.active = true
      this.power = power;
    }

    draw(ctx){
      if( !this.active ) return ;

        ctx.beginPath();
        ctx.fillStyle = "black";
        ctx.arc(this.x, this.y, 2, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();

    } 

    update(dt){
        if( !this.active ) return ;
        let vdir = getNormalizedDirecton(this.target, this);

        this.x += vdir.x * dt * dtFactor * this.baseSpeed;
        this.y += vdir.y * dt * dtFactor * this.baseSpeed;

        if ( distance(this,this.target) < 2 ) {
            this.target.hp -= this.power;
            this.active = false;
        }

    }
} 

class Archer extends CombatEntity {
  constructor(team ,x = undefined,y = undefined,hp = 100,attack = 10,speed = 5,attackSpeed = 1) {
    super(team,x,y,hp,attack,speed,attackSpeed)
    this.state = "idle";
    this.name = 'Archer'
    this.target = null
    this.img = new Image();
    this.img.src = `./archer-${this.team.toLocaleLowerCase()}.png`;
    console.log(this.attackSpeed)

  }

  draw(ctx) {
    ctx.drawImage(this.img , this.x - 8,this.y - 8 ,16,16);
  } 

  
  update(dt,gameState) {
    if (this.hp < 1)  { this.active = false; return; }

    let movingFactor = dt * dtFactor * this.speed;

    if ( !this.target ) {
      let enemies = gameState.soldiers.filter((s) => s.team != this.team);
      let friends = gameState.soldiers.filter((s) => s.team == this.team);
      let closestEnemy = null;
      let closestDistance = Infinity;
      for (let i = 0; i < enemies.length; i++) {
        let dist = distance(this, enemies[i]  );
        if (dist < closestDistance && enemies[i].active ) {
          closestEnemy = enemies[i];
          closestDistance = dist;
        }
      }
      this.target = closestEnemy
      this.state = 'approaching'
    } else if( !this.target.active ) {
      this.state = 'idle'
      this.target = null;
    } else if( this.state == 'approaching'  ) {
      let vdir = getNormalizedDirecton(this.target, this);
      if (distance(this,this.target) < 150) {
        this.state = "attacking";
      } else {
        this.x += vdir.x * movingFactor;
        this.y += vdir.y * movingFactor;
      }
    } else if ( this.state == 'attacking' ) {
      if( distance(this,this.target) > 155 ) {
        this.state = 'approaching'
      } else {
        this.timeFromLastAttack += dt;
        if (this.timeFromLastAttack > 1000/this.attackSpeed) {
          gameState.missiles.push( new Missile(this.target,this.x,this.y,this.attack) )
          this.timeFromLastAttack = 0;
        }
      }
    }


  } 
  
  
}

class Soldier extends CombatEntity{
  
  constructor(team,x = undefined,y = undefined,hp = 100,attack = 10,speed = 5,attackSpeed = 1) {
    super(team,x,y,hp,attack,speed,attackSpeed)
    this.state = "seaching";
    this.name = 'Melee'
    this.img = new Image();
    this.img.src = `./soldier-${this.team.toLocaleLowerCase()}.png`;
    this.target = null;
  }

  draw(ctx) {
    const animationDuration = 200;
    if ( this.timeFromLastAttack < animationDuration  ) {
      // use the time from attack to get a rotation form 0 to 0 and 250 to 2pi
      let rotation = 0;
      let timeFrame = 0;
      let circleDiv = 16
      let stepLength = 50
      if ( this.timeFromLastAttack < animationDuration - stepLength * 3 ) {
        timeFrame = (this.timeFromLastAttack) / stepLength
        rotation = timeFrame / circleDiv;
      } else if ( this.timeFromLastAttack < animationDuration - stepLength * 2 ) {
        timeFrame = (this.timeFromLastAttack - stepLength * 1) / stepLength
        rotation = (1/circleDiv) - (timeFrame / circleDiv);
      } else if ( this.timeFromLastAttack < animationDuration - stepLength * 1  ) {
        timeFrame = (this.timeFromLastAttack - stepLength * 2) / stepLength
        rotation = -(timeFrame / circleDiv);
      } else if ( this.timeFromLastAttack < animationDuration ) {
        timeFrame = (this.timeFromLastAttack - stepLength * 2) / stepLength
        rotation = -(1/circleDiv) + (timeFrame / circleDiv);
      }

      ctx.save();
      ctx.translate(this.x,this.y);
      ctx.rotate( rotation * 2 * Math.PI );
      ctx.drawImage(this.img,-10 ,  -10,20,20);
      ctx.restore()
    } else {
      ctx.drawImage(this.img , this.x - 10,this.y - 10 ,20,20);
    }
  }

  update(dt, {soldiers}) {

    if (this.hp < 1) {
      this.active = false;
      return;
    }
    let enemies = soldiers.filter((s) => s.team != this.team);
    let friends = soldiers.filter((s) => s.team == this.team);
    let movingFactor = dt * dtFactor * this.speed;
    this.timeFromLastAttack += dt;
    
    if ( this.target == null || !this.target.active ) {

      let closestEnemy = null;
      let closestDistance = Infinity;
      
      for (let i = 0; i < enemies.length; i++) {
        let dist = distance(this, enemies[i]  );
        if ( enemies[i].active && dist < closestDistance  ) {
          closestEnemy = enemies[i];
          closestDistance = dist;
        }
      }

      this.target = closestEnemy;
    } else if ( distance(this,this.target) < 15 ) {
      if (this.timeFromLastAttack > 1000/this.attackSpeed) {
        this.target.hp -= this.attack;
        this.timeFromLastAttack = 0;
      }
    } else {      
      let vdir = getNormalizedDirecton(this.target, this);
      this.x += vdir.x * movingFactor;
      this.y += vdir.y * movingFactor;
    }
  }
}

window.addEventListener("load", () => {
  let canvas = document.getElementById("main-canvas");
  let ctx = canvas.getContext("2d");



  canvas.addEventListener("click", (e) => {
    let mouseX = e.clientX - canvas.offsetLeft;
    let mouseY = e.clientY - canvas.offsetTop;
    let hp = el("#soldier-hp").value;
    let type = el("#soldier-type").value;
    let team = el("#soldier-team").value;
    let attack = el("#soldier-attack").value;
    let speed = el("#soldier-speed").value;
    let atkSpeed = Math.min(Math.max(el("#soldier-atk-speed").value,1),5);

    el("#soldier-atk-speed").value = atkSpeed


    if( type == 'melee'  )  {
      soldiers.push( new Soldier(team.toLocaleUpperCase(),mouseX,mouseY,hp,attack,speed,atkSpeed) )

    } else if (  type == 'archer' ) {

      soldiers.push( new Archer(team.toLocaleUpperCase(),mouseX,mouseY,hp,attack,speed,atkSpeed) )
    }

  });

  el("#start-button").addEventListener("click", () => {
    gameState.running = true;
  });

  el("#stop-button").addEventListener("click", () => {
    gameState.running = false;
  })




  let missiles = []
  let soldiers = [];

  let gameState = {running: false,soldiers:soldiers,missiles:missiles}
  gameState.soldiers = soldiers;


  for (let i = 0; i < 2; i++) {
    soldiers.push(new Soldier("A"));
    soldiers.push(new Soldier("B"));
    soldiers.push(new Archer("A"));
    soldiers.push(new Archer("B"));
  }

  //game loop
  let lastTime = new Date().getTime();
  function gameLoop() {
    let currTime = new Date().getTime();
    let dt = currTime - lastTime;
    lastTime = currTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const entities = [...missiles,...soldiers]





    for (let i = 0; i < entities.length && true ; i++) {
      if ( !entities[i].active  ) {
        continue;
      }
      if (gameState.running) {
        updatePage(gameState);
        entities[i].update(dt,gameState);
      }
      entities[i].draw(ctx);
    }

    //updatePage(gameState);
    

    // const img = new Image()
    // img.src = './archer-a.png'
    // ctx.fillStyle='orange'
    // ctx.save()
    // ctx.translate(150,150)
    
    // ctx.rotate( (cont % 100)/100   *2*Math.PI);
    // ctx.fillRect(0,0,40,40)
    // ctx.restore()
    // updatePage(gameState);

    requestAnimationFrame(gameLoop);
    // cont++;
  }
  requestAnimationFrame(gameLoop);
});


function updatePage(gameState) {
  let soldiersA = gameState.soldiers.filter((s) => s.team == "A" && s.active );
  let soldiersB = gameState.soldiers.filter((s) => s.team == "B" && s.active );
  let soldiersAList = el("#soldiers-a ul");
  let soldiersBList = el("#soldiers-b ul"); 
   


  soldiersAListHTML = ''
  soldiersBListHTML = ''
  let counter = 1;
  for ( const npc of soldiersA ) {
    soldiersAListHTML += `
      <li class="soldier-stats" >
        <span class="stat-span" > ${ npc.name }${counter} </span>

        <span class="stat-span hp" ><img src="./hp.jfif" width="18" height="18" /> ${npc.hp} </span>
        <span class="stat-span small" ><img src="./sword.png" width="18" height="18" /> ${npc.attack} </span>
        <span class="stat-span small" ><img src="./mov-speed.png" width="18" height="18" /> ${npc.speed} </span>
        <span class="stat-span small" ><img src="./atk-speed.png" width="18" height="18" /> ${npc.attackSpeed} </span>
      </li>`
    counter++;
  }

  counter = 1;
  for ( const npc of soldiersB ) {
    soldiersBListHTML += `
      <li class="soldier-stats" >
        <span > ${ npc.name }${counter} </span>
        <span  class="stat-span hp" ><img src="./hp.jfif" width="18" height="18" /> ${npc.hp}</span>
        <span  class="stat-span small" ><img src="./sword.png" width="18" height="18" /> ${npc.attack}</span>
        <span  class="stat-span small" ><img src="./mov-speed.png" width="18" height="18" /> ${npc.speed}</span>
        <span  class="stat-span small" ><img src="./atk-speed.png" width="18" height="18" /> ${npc.attackSpeed}</span>
      </li>`
    counter++;
  }

  
  soldiersAList.innerHTML = soldiersAListHTML;
  soldiersBList.innerHTML = soldiersBListHTML;


}

function el(query) {
  return document.querySelector(query);
}