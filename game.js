const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowDown: false,
    x: false,
    a: false,
    b: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// Game Entities
let player;
let bullets = [];
let bombs = [];
let enemies = [];
let tanks = [];
let particles = [];

// Constants
const GRAVITY = 0.6;
const GROUND_Y = 350;

class Player {
    constructor() {
        this.x = 100;
        this.y = GROUND_Y;
        this.vx = 0;
        this.vy = 0;
        this.speed = 4;
        this.jumpForce = -12;
        this.width = 40;
        this.height = 60;
        this.dir = 1; // 1 for right, -1 for left
        this.isJumping = false;
        this.isDucking = false;
        
        this.maxHp = 10;
        this.hp = this.maxHp;
        
        this.shootCooldown = 0;
        this.bombCooldown = 0;
        
        // Animation states
        this.animTime = 0;
        this.isShooting = false;
        this.shootTime = 0;
    }

    update() {
        // Ducking
        if (keys.ArrowDown && !this.isJumping) {
            this.isDucking = true;
            this.vx = 0; // stop moving when ducking
            this.animTime = 0;
        } else {
            this.isDucking = false;
            // Movement
            if (keys.ArrowLeft) {
                this.vx = -this.speed;
                this.dir = -1;
                this.animTime += 0.2;
            } else if (keys.ArrowRight) {
                this.vx = this.speed;
                this.dir = 1;
                this.animTime += 0.2;
            } else {
                this.vx = 0;
                this.animTime = 0; // reset to idle
            }
        }

        this.x += this.vx;

        // Jump
        if (keys.x && !this.isJumping && !this.isDucking) {
            this.vy = this.jumpForce;
            this.isJumping = true;
            keys.x = false; 
        }

        // Gravity
        this.vy += GRAVITY;
        this.y += this.vy;

        // Ground collision
        if (this.y >= GROUND_Y) {
            this.y = GROUND_Y;
            this.vy = 0;
            this.isJumping = false;
        }

        // Keep in bounds
        if (this.x < 20) this.x = 20;
        if (this.x > canvas.width - 20) this.x = canvas.width - 20;

        // Shooting
        if (this.shootCooldown > 0) this.shootCooldown--;
        if (keys.a && this.shootCooldown <= 0) {
            let shootY = this.y - (this.isDucking ? 20 : 40);
            let b = new Bullet(this.x + (20 * this.dir), shootY, this.dir, false);
            bullets.push(b);
            this.shootCooldown = 10;
            this.isShooting = true;
            this.shootTime = 10;
        }

        // Bomb throwing
        if (this.bombCooldown > 0) this.bombCooldown--;
        if (keys.b && this.bombCooldown <= 0) {
            let throwY = this.y - (this.isDucking ? 20 : 40);
            bombs.push(new Bomb(this.x, throwY, this.dir));
            this.bombCooldown = 60;
        }
        
        if (this.shootTime > 0) {
            this.shootTime--;
        } else {
            this.isShooting = false;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.dir, 1); 

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        let dY = this.isDucking ? 25 : 0; 

        // Procedural Stickman Animation
        const swing = Math.sin(this.animTime);
        
        let leftLegAngle = 0;
        let rightLegAngle = 0;
        let leftArmAngle = 0;
        let rightArmAngle = 0;

        if (this.isJumping) {
            leftLegAngle = Math.PI / 4;
            rightLegAngle = -Math.PI / 4;
            leftArmAngle = -Math.PI / 4;
            rightArmAngle = Math.PI / 4;
        } else if (this.isDucking) {
            leftLegAngle = Math.PI / 2.5;
            rightLegAngle = -Math.PI / 2.5;
            leftArmAngle = -Math.PI / 4;
            rightArmAngle = Math.PI / 4;
        } else if (this.vx !== 0) {
            leftLegAngle = swing * 0.8;
            rightLegAngle = -swing * 0.8;
            leftArmAngle = -swing * 0.8;
            rightArmAngle = swing * 0.8;
        }

        // Head
        ctx.beginPath();
        ctx.arc(0, -55 + dY, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#ffcc99'; 
        ctx.fill();
        ctx.stroke();

        // Body
        ctx.beginPath();
        ctx.moveTo(0, -45 + dY);
        ctx.lineTo(0, -25 + dY);
        ctx.stroke();

        // Legs
        const legLen = this.isDucking ? 15 : 25;
        // Left Leg
        ctx.beginPath();
        ctx.moveTo(0, -25 + dY);
        ctx.lineTo(Math.sin(leftLegAngle) * legLen, -25 + dY + Math.cos(leftLegAngle) * legLen);
        ctx.stroke();
        // Right Leg
        ctx.beginPath();
        ctx.moveTo(0, -25 + dY);
        ctx.lineTo(Math.sin(rightLegAngle) * legLen, -25 + dY + Math.cos(rightLegAngle) * legLen);
        ctx.stroke();

        // Arms
        const armLen = 20;
        
        // Gun Arm (Right Arm)
        ctx.beginPath();
        ctx.moveTo(0, -40 + dY);
        if (this.isShooting) {
            ctx.lineTo(armLen, -40 + dY);
            ctx.fillStyle = '#333';
            ctx.fillRect(armLen, -42 + dY, 15, 4);
            ctx.fillRect(armLen, -42 + dY, 4, 8);
        } else {
            ctx.lineTo(Math.sin(rightArmAngle) * armLen, -40 + dY + Math.cos(rightArmAngle) * armLen);
        }
        ctx.stroke();

        // Left Arm (background arm)
        ctx.beginPath();
        ctx.moveTo(0, -40 + dY);
        ctx.lineTo(Math.sin(leftArmAngle) * armLen, -40 + dY + Math.cos(leftArmAngle) * armLen);
        ctx.stroke();

        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, dir, isEnemy = false) {
        this.x = x;
        this.y = y;
        this.vx = (isEnemy ? 7 : 15) * dir; 
        this.width = 10;
        this.height = 4;
        this.active = true;
        this.isEnemy = isEnemy;
        this.damage = 1; // Default damage
    }
    update() {
        this.x += this.vx;
        if (this.x < 0 || this.x > canvas.width) {
            this.active = false;
        }
    }
    draw(ctx) {
        ctx.fillStyle = this.isEnemy ? '#ff3b3b' : '#ffeb3b'; 
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Bomb {
    constructor(x, y, dir) {
        this.x = x;
        this.y = y;
        this.vx = 8 * dir;
        this.vy = -10;
        this.radius = 6;
        this.active = true;
        this.timer = 60; 
    }
    update() {
        this.x += this.vx;
        this.vy += GRAVITY;
        this.y += this.vy;

        if (this.y >= GROUND_Y) {
            this.y = GROUND_Y;
            this.vx *= 0.5; 
            this.vy *= -0.4; 
        }

        this.timer--;
        if (this.timer <= 0) {
            this.explode();
        }
    }
    explode() {
        this.active = false;
        for(let i=0; i<20; i++) {
            particles.push(new Particle(this.x, this.y, 'orange'));
        }
        
        // Damage soldiers
        enemies.forEach(enemy => {
            let dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist < 100) {
                enemy.hp -= 5;
            }
        });
        
        // Damage tanks
        tanks.forEach(tank => {
            let dist = Math.hypot(tank.x - this.x, tank.y - this.y);
            if (dist < 120) {
                tank.hp -= 5;
            }
        });
    }
    draw(ctx) {
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        if (this.timer % 4 < 2) {
            ctx.fillStyle = 'orange';
            ctx.fillRect(this.x - 2, this.y - this.radius - 4, 4, 4);
        }
    }
}

class Enemy {
    constructor(x) {
        this.x = x;
        this.y = GROUND_Y;
        this.maxHp = 3;
        this.hp = this.maxHp;
        this.active = true;
        this.animTime = Math.random() * 10;
        this.shootCooldown = 60 + Math.random() * 60;
    }
    update() {
        let dx = player.x - this.x;
        if (Math.abs(dx) > 250) { 
            this.x += Math.sign(dx) * 1.5;
            this.animTime += 0.15;
        } else {
            this.animTime = 0;
            if (this.shootCooldown > 0) {
                this.shootCooldown--;
            } else {
                let dir = Math.sign(player.x - this.x) || 1;
                bullets.push(new Bullet(this.x + (15 * dir), this.y - 38, dir, true));
                this.shootCooldown = 80 + Math.random() * 60; 
            }
        }

        if (this.hp <= 0) {
            this.active = false;
            for(let i=0; i<10; i++) {
                particles.push(new Particle(this.x, this.y - 30, 'red'));
            }
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-15, -75, 30, 4);
        ctx.fillStyle = '#00ff00';
        let hpWidth = Math.max(0, (this.hp / this.maxHp) * 30);
        ctx.fillRect(-15, -75, hpWidth, 4);

        let dir = Math.sign(player.x - this.x) || 1;
        ctx.scale(dir, 1);

        ctx.strokeStyle = '#006400'; 
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const swing = Math.sin(this.animTime);
        let legAngle = swing * 0.8;

        // Head
        ctx.beginPath();
        ctx.arc(0, -55, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#ffcc99';
        ctx.fill();
        ctx.stroke();

        // Helmet
        ctx.beginPath();
        ctx.arc(0, -55, 11, Math.PI, 0);
        ctx.fillStyle = '#006400';
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.moveTo(0, -45);
        ctx.lineTo(0, -25);
        ctx.stroke();

        // Legs
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(Math.sin(legAngle) * 25, -25 + Math.cos(legAngle) * 25);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(Math.sin(-legAngle) * 25, -25 + Math.cos(-legAngle) * 25);
        ctx.stroke();
        
        // Arms holding rifle
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.lineTo(15, -35);
        ctx.stroke();
        
        // Rifle
        ctx.fillStyle = '#111';
        ctx.fillRect(5, -38, 25, 4);

        ctx.restore();
    }
}

class Tank {
    constructor(x) {
        this.x = x;
        this.y = GROUND_Y;
        this.maxHp = 15;
        this.hp = this.maxHp;
        this.active = true;
        this.shootCooldown = 100 + Math.random() * 50;
        this.width = 80;
        this.height = 40;
    }
    update() {
        // Move slowly
        let dx = player.x - this.x;
        if (Math.abs(dx) > 300) {
            this.x += Math.sign(dx) * 0.7; // Slower than soldier
        } else {
            // Shoot
            if (this.shootCooldown > 0) {
                this.shootCooldown--;
            } else {
                let dir = Math.sign(player.x - this.x) || 1;
                // Tank shoots bigger bullet that deals more damage
                let b = new Bullet(this.x + (40 * dir), this.y - 32, dir, true);
                b.damage = 3;
                b.width = 16;
                b.height = 8;
                bullets.push(b);
                this.shootCooldown = 150;
            }
        }

        // Crush player check
        let playerLeft = player.x - 15;
        let playerRight = player.x + 15;
        let tankLeft = this.x - this.width/2;
        let tankRight = this.x + this.width/2;
        
        // Check if player is intersecting tank body
        if (player.y > this.y - this.height && player.y - 60 < this.y) {
            if (playerRight > tankLeft && playerLeft < tankRight) {
                // Player crushed
                player.hp = 0; 
                particles.push(new Particle(player.x, player.y - 20, '#ff0000'));
            }
        }

        if (this.hp <= 0) {
            this.active = false;
            // Big explosion
            for(let i=0; i<30; i++) {
                particles.push(new Particle(this.x + (Math.random()-0.5)*80, this.y - (Math.random()*40), 'orange'));
                particles.push(new Particle(this.x + (Math.random()-0.5)*80, this.y - (Math.random()*40), 'gray'));
            }
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Health bar
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-25, -60, 50, 6);
        ctx.fillStyle = '#00ff00';
        let hpWidth = Math.max(0, (this.hp / this.maxHp) * 50);
        ctx.fillRect(-25, -60, hpWidth, 6);

        let dir = Math.sign(player.x - this.x) || 1;
        ctx.scale(dir, 1);

        // Tank Tracks (using path as roundRect might not be supported everywhere, but it's okay for modern canvas)
        ctx.fillStyle = '#111';
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(-45, -12, 90, 12, 5);
            ctx.fill();
        } else {
            ctx.fillRect(-45, -12, 90, 12);
        }

        // Tank Body
        ctx.fillStyle = '#556B2F'; // Dark Olive Green
        ctx.fillRect(-35, -30, 70, 20);
        
        // Tank details
        ctx.fillStyle = '#445626';
        ctx.fillRect(-25, -25, 50, 10);

        // Turret
        ctx.fillStyle = '#4A5D23';
        ctx.beginPath();
        ctx.arc(0, -30, 18, Math.PI, 0);
        ctx.fill();

        // Gun Barrel
        ctx.fillStyle = '#333';
        ctx.fillRect(0, -38, 55, 8);
        ctx.fillStyle = '#222';
        ctx.fillRect(50, -40, 8, 12); // muzzle

        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 5 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
        this.color = color;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

function spawnEnemy() {
    if (Math.random() < 0.02 && enemies.length + tanks.length < 5) {
        let x = Math.random() > 0.5 ? canvas.width + 50 : -50;
        
        // 10% chance to spawn a tank instead of a soldier
        if (Math.random() < 0.1) {
            tanks.push(new Tank(x));
        } else {
            enemies.push(new Enemy(x));
        }
    }
}

function init() {
    player = new Player();
    gameLoop();
}

function resetGame() {
    player.hp = player.maxHp;
    player.x = 100;
    enemies = [];
    tanks = [];
    bullets = [];
    bombs = [];
}

function update() {
    player.update();
    
    spawnEnemy();

    bullets.forEach(b => b.update());
    bombs.forEach(b => b.update());
    enemies.forEach(e => e.update());
    tanks.forEach(t => t.update());
    particles.forEach(p => p.update());

    // Death check
    if (player.hp <= 0) {
        resetGame();
    }

    // Collisions: Bullets
    bullets.forEach(bullet => {
        if (!bullet.active) return;

        if (bullet.isEnemy) {
            // Check collision with player
            let playerTop = player.y - (player.isDucking ? 30 : 65);
            let playerBottom = player.y;
            let playerLeft = player.x - 15;
            let playerRight = player.x + 15;

            if (bullet.x > playerLeft && bullet.x < playerRight &&
                bullet.y > playerTop && bullet.y < playerBottom) {
                bullet.active = false;
                particles.push(new Particle(bullet.x, bullet.y, '#ff3b3b'));
                
                player.hp -= bullet.damage;
            }
        } else {
            // Check collision with soldiers
            enemies.forEach(enemy => {
                if (enemy.active) {
                    if (bullet.x > enemy.x - 15 && bullet.x < enemy.x + 15 &&
                        bullet.y > enemy.y - 65 && bullet.y < enemy.y) {
                        bullet.active = false;
                        enemy.hp -= bullet.damage;
                        particles.push(new Particle(bullet.x, bullet.y, '#ffeb3b'));
                    }
                }
            });
            // Check collision with tanks
            tanks.forEach(tank => {
                if (tank.active) {
                    let tankLeft = tank.x - tank.width/2;
                    let tankRight = tank.x + tank.width/2;
                    if (bullet.x > tankLeft && bullet.x < tankRight &&
                        bullet.y > tank.y - tank.height && bullet.y < tank.y) {
                        bullet.active = false;
                        tank.hp -= bullet.damage;
                        particles.push(new Particle(bullet.x, bullet.y, '#aaaaaa')); // metal spark
                    }
                }
            });
        }
    });

    // Remove inactive entities
    bullets = bullets.filter(b => b.active);
    bombs = bombs.filter(b => b.active);
    enemies = enemies.filter(e => e.active);
    tanks = tanks.filter(t => t.active);
    particles = particles.filter(p => p.life > 0);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Ground
    ctx.fillStyle = '#654321'; // Brown dirt
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    ctx.fillStyle = '#228B22'; // Grass top
    ctx.fillRect(0, GROUND_Y, canvas.width, 10);

    player.draw(ctx);
    
    tanks.forEach(t => t.draw(ctx)); // Draw tanks behind enemies
    enemies.forEach(e => e.draw(ctx));
    bullets.forEach(b => b.draw(ctx));
    bombs.forEach(b => b.draw(ctx));
    particles.forEach(p => p.draw(ctx));

    // Draw Player Health Bar UI
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(15, 15, 210, 25); 
    
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(20, 20, 200, 15); 
    
    ctx.fillStyle = '#00ff00';
    let hpWidth = Math.max(0, (player.hp / player.maxHp) * 200);
    ctx.fillRect(20, 20, hpWidth, 15); 
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('PLAYER HP', 20, 12);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

init();
