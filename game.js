const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = 'PLAYING'; // PLAYING or GAMEOVER

const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowDown: false,
    x: false,
    a: false,
    b: false
};

window.addEventListener('keydown', (e) => {
    if (gameState === 'GAMEOVER') {
        resetGame();
        return;
    }
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// Click/Touch canvas to restart
canvas.addEventListener('mousedown', (e) => {
    if (gameState === 'GAMEOVER') resetGame();
});
canvas.addEventListener('touchstart', (e) => {
    if (gameState === 'GAMEOVER') {
        e.preventDefault();
        resetGame();
    }
});


// Mobile Controls Binding (Optimized with Pointer Events)
function bindButton(btnId, keyName) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    // Pointer events are significantly faster and unify touch/mouse with no 300ms delay
    btn.addEventListener('pointerdown', (e) => {
        if (gameState === 'GAMEOVER') { resetGame(); return; }
        e.preventDefault();
        keys[keyName] = true;
    });
    btn.addEventListener('pointerup', (e) => {
        e.preventDefault();
        keys[keyName] = false;
    });
    btn.addEventListener('pointerleave', (e) => {
        keys[keyName] = false;
    });
    btn.addEventListener('pointercancel', (e) => {
        keys[keyName] = false;
    });
    // Fallback for some older devices to prevent ghost clicks
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); }, {passive: false});
}

bindButton('btn-left', 'ArrowLeft');
bindButton('btn-right', 'ArrowRight');
bindButton('btn-down', 'ArrowDown');
bindButton('btn-x', 'x');
bindButton('btn-a', 'a');
bindButton('btn-b', 'b');


// Game Entities
let player;
let bullets = [];
let bombs = [];
let enemies = [];
let tanks = [];
let particles = [];

class Powerup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vy = 0;
        this.active = true;
    }
    update() {
        this.vy += GRAVITY;
        let oldY = this.y;
        this.y += this.vy;
        if (this.vy >= 0) {
            let onStair = false;
            for (let i = 0; i < STAIRS.length; i++) {
                let s = STAIRS[i];
                let px = this.x;
                if (px >= s.x1 && px <= s.x2) {
                    let pct = (px - s.x1) / (s.x2 - s.x1);
                    let stairY = s.y1 + pct * (s.y2 - s.y1);
                    if (oldY <= stairY + 10 && this.y >= stairY - 10) {
                        this.y = stairY;
                        this.vy = 0;
                        onStair = true;
                        break;
                    }
                }
            }
            if (!onStair && this.vy > 0) {
                for (let i = 0; i < PLATFORMS.length; i++) {
                    let py = PLATFORMS[i];
                    if (oldY <= py && this.y >= py) {
                        this.y = py;
                        this.vy = 0;
                        break;
                    }
                }
            }
        }
        
        // Prevent falling off the bottom
        if (this.y >= GROUND_Y) {
            this.y = GROUND_Y;
            this.vy = 0;
        }
        
        // Player collision
        let playerTop = player.y - (player.isDucking ? 30 : 60);
        let dist = Math.hypot(player.x - this.x, (player.y + playerTop)/2 - (this.y - 15));
        if (dist < 40) {
            this.active = false;
            player.weapon = 'H';
            player.hAmmo = 100;
        }
    }
    draw(ctx) {
        ctx.fillStyle = '#f1c40f'; // Yellow box
        ctx.fillRect(this.x - 15, this.y - 30, 30, 30);
        ctx.fillStyle = '#e74c3c'; // Red H
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('H', this.x, this.y - 8);
        ctx.textAlign = 'left';
    }
}
let powerups = [];


// Constants
const GRAVITY = 0.6;
const GROUND_Y = 350;
const PLATFORMS = [150, 250, 350];
const STAIRS = [
    { x1: 150, y1: 350, x2: 250, y2: 250 },
    { x1: 550, y1: 250, x2: 650, y2: 150 }
];

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
        this.weapon = 'normal';
        this.hAmmo = 0;
    }

    update() {
        if (this.hp <= 0) return; // Don't move if dead
        
        // Ducking
        if (keys.ArrowDown && onGround) {
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
        if (keys.x && onGround && !keys.ArrowDown) {
            this.vy = this.jumpForce;
            this.isJumping = true;
            keys.x = false; 
        }

        // Gravity
        this.vy += GRAVITY;
        let oldY = this.y;
        this.y += this.vy;
        let onGround = false;

        // Platform and Stair collision
        if (this.vy >= 0) { // Collide when falling or walking flat
            
            // 1. Check Stairs first
            let onStair = false;
            for (let i = 0; i < STAIRS.length; i++) {
                let s = STAIRS[i];
                let px = this.x;
                // If within stair horizontal bounds
                if (px >= s.x1 && px <= s.x2) {
                    let pct = (px - s.x1) / (s.x2 - s.x1);
                    let stairY = s.y1 + pct * (s.y2 - s.y1);
                    
                    // If we are falling onto the stairs, or already standing on them (within a margin of error)
                    if (oldY <= stairY + 10 && this.y >= stairY - 10) {
                        if (keys.ArrowDown && keys.x) {
                            // drop through
                        } else {
                            this.y = stairY;
                            this.vy = 0;
                            this.isJumping = false;
                            onGround = true;
                            onStair = true;
                            break;
                        }
                    }
                }
            }
            
            // 2. Check Platforms if not on a stair
            if (!onStair && this.vy > 0) {
                for (let i = 0; i < PLATFORMS.length; i++) {
                    let py = PLATFORMS[i];
                    if (oldY <= py && this.y >= py) {
                        if (keys.ArrowDown && keys.x && py !== GROUND_Y) {
                            // Drop through
                        } else {
                            this.y = py;
                            this.vy = 0;
                            this.isJumping = false;
                            onGround = true;
                            break;
                        }
                    }
                }
            }
        }
        
        // Prevent falling off the bottom
        if (this.y >= GROUND_Y) {
            this.y = GROUND_Y;
            this.vy = 0;
            this.isJumping = false;
            onGround = true;
        }

        // Keep in bounds
        if (this.x < 20) this.x = 20;
        if (this.x > canvas.width - 20) this.x = canvas.width - 20;

        // Shooting
        if (this.shootCooldown > 0) this.shootCooldown--;
        if (keys.a && this.shootCooldown <= 0) {
            let shootY = this.y - (this.isDucking ? 20 : 40);
            
            if (this.weapon === 'H' && this.hAmmo > 0) {
                let b = new Bullet(this.x + (20 * this.dir), shootY + (Math.random()*10 - 5), this.dir, false);
                b.width = 14;
                b.vx = 20 * this.dir; // faster
                bullets.push(b);
                this.shootCooldown = 3; // very fast shooting
                this.hAmmo--;
                if (this.hAmmo <= 0) this.weapon = 'normal';
            } else {
                let b = new Bullet(this.x + (20 * this.dir), shootY, this.dir, false);
                bullets.push(b);
                this.shootCooldown = 10;
            }
            
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
        if (this.hp <= 0) return; // Don't draw player if dead
        
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

        if (this.vy > 0) {
            for (let i = 0; i < PLATFORMS.length; i++) {
                let py = PLATFORMS[i];
                if (this.y - this.vy <= py && this.y >= py) {
                    this.y = py;
                    this.vx *= 0.5; 
                    this.vy *= -0.4; 
                    break;
                }
            }
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
        this.y = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
        this.maxHp = 3;
        this.hp = this.maxHp;
        this.active = true;
        this.animTime = Math.random() * 10;
        this.shootCooldown = 60 + Math.random() * 60;
    }
    update() {
        this.vy = this.vy || 0;
        this.vy += GRAVITY;
        let oldY = this.y;
        this.y += this.vy;
        if (this.vy >= 0) {
            let onStair = false;
            for (let i = 0; i < STAIRS.length; i++) {
                let s = STAIRS[i];
                let px = this.x;
                if (px >= s.x1 && px <= s.x2) {
                    let pct = (px - s.x1) / (s.x2 - s.x1);
                    let stairY = s.y1 + pct * (s.y2 - s.y1);
                    if (oldY <= stairY + 10 && this.y >= stairY - 10) {
                        this.y = stairY;
                        this.vy = 0;
                        onStair = true;
                        break;
                    }
                }
            }
            if (!onStair && this.vy > 0) {
                for (let i = 0; i < PLATFORMS.length; i++) {
                    let py = PLATFORMS[i];
                    if (oldY <= py && this.y >= py) {
                        this.y = py;
                        this.vy = 0;
                        break;
                    }
                }
            }
        }
        
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
        this.y = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
        this.maxHp = 15;
        this.hp = this.maxHp;
        this.active = true;
        this.shootCooldown = 100 + Math.random() * 50;
        this.width = 140;
        this.height = 70;
    }
    update() {
        this.vy = this.vy || 0;
        this.vy += GRAVITY;
        let oldY = this.y;
        this.y += this.vy;
        if (this.vy >= 0) {
            let onStair = false;
            for (let i = 0; i < STAIRS.length; i++) {
                let s = STAIRS[i];
                let px = this.x;
                if (px >= s.x1 && px <= s.x2) {
                    let pct = (px - s.x1) / (s.x2 - s.x1);
                    let stairY = s.y1 + pct * (s.y2 - s.y1);
                    if (oldY <= stairY + 10 && this.y >= stairY - 10) {
                        this.y = stairY;
                        this.vy = 0;
                        onStair = true;
                        break;
                    }
                }
            }
            if (!onStair && this.vy > 0) {
                for (let i = 0; i < PLATFORMS.length; i++) {
                    let py = PLATFORMS[i];
                    if (oldY <= py && this.y >= py) {
                        this.y = py;
                        this.vy = 0;
                        break;
                    }
                }
            }
        }
        
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
                let b = new Bullet(this.x + (70 * dir), this.y - 50, dir, true);
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
        if (player.hp > 0 && player.y > this.y - this.height && player.y - 60 < this.y) {
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
        ctx.fillRect(-35, -85, 70, 6);
        ctx.fillStyle = '#00ff00';
        let hpWidth = Math.max(0, (this.hp / this.maxHp) * 70);
        ctx.fillRect(-35, -85, hpWidth, 6);

        let dir = Math.sign(player.x - this.x) || 1;
        ctx.scale(dir, 1);

        // Tank Tracks
        ctx.fillStyle = '#111';
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(-70, -18, 140, 18, 5);
            ctx.fill();
        } else {
            ctx.fillRect(-70, -18, 140, 18);
        }

        // Tank Body
        ctx.fillStyle = '#556B2F'; // Dark Olive Green
        ctx.fillRect(-55, -45, 110, 30);
        
        // Tank details
        ctx.fillStyle = '#445626';
        ctx.fillRect(-40, -35, 80, 15);

        // Turret
        ctx.fillStyle = '#4A5D23';
        ctx.beginPath();
        ctx.arc(0, -45, 25, Math.PI, 0);
        ctx.fill();

        // Gun Barrel
        ctx.fillStyle = '#333';
        ctx.fillRect(0, -55, 80, 12);
        ctx.fillStyle = '#222';
        ctx.fillRect(70, -58, 12, 18); // muzzle

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
    if (Math.random() < 0.06 && enemies.length + tanks.length < 15) {
        let x = Math.random() > 0.5 ? canvas.width + 50 : -50;
        
        // 10% chance to spawn a tank instead of a soldier
        if (Math.random() < 0.15) {
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
    gameState = 'PLAYING';
    
    // Clear pressed keys
    for(let k in keys) {
        keys[k] = false;
    }
}

function update() {
    if (gameState === 'GAMEOVER') return;
    
    player.update();
    
    spawnEnemy();
    if (Math.random() < 0.005 && powerups.length < 1) powerups.push(new Powerup(Math.random()*canvas.width, 0));

    bullets.forEach(b => b.update());
    bombs.forEach(b => b.update());
    enemies.forEach(e => e.update());
    tanks.forEach(t => t.update());
    particles.forEach(p => p.update());
    powerups.forEach(p => p.update());

    // Death check
    if (player.hp <= 0) {
        gameState = 'GAMEOVER';
        for(let i=0; i<30; i++) {
            particles.push(new Particle(player.x, player.y - 30, '#ff0000'));
        }
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

            if (player.hp > 0 && bullet.x > playerLeft && bullet.x < playerRight &&
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
                        particles.push(new Particle(bullet.x, bullet.y, '#aaaaaa')); 
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


// Cache background to improve performance
const bgCanvas = document.createElement('canvas');
bgCanvas.width = 800;
bgCanvas.height = 400;
const bgCtx = bgCanvas.getContext('2d', { alpha: false });

function drawBackgroundOnce() {
    ctx.drawImage(bgCanvas, 0, 0);
}
drawBackgroundOnce();

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(bgCanvas, 0, 0);

    player.draw(ctx);
    
    tanks.forEach(t => t.draw(ctx)); // Draw tanks behind enemies
    enemies.forEach(e => e.draw(ctx));
    bullets.forEach(b => b.draw(ctx));
    bombs.forEach(b => b.draw(ctx));
    particles.forEach(p => p.draw(ctx));
    powerups.forEach(p => p.draw(ctx));

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
    ctx.textAlign = 'left';
    ctx.fillText('PLAYER HP', 20, 12);

    // Draw Weapon UI
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    if (player.weapon === 'H') {
        ctx.fillStyle = '#f1c40f';
        ctx.fillText(`HEAVY MACHINE GUN: ${player.hAmmo}`, 20, 50);
    } else {
        ctx.fillText(`PISTOL`, 20, 50);
    }

    
    // Draw Game Over Overlay
    if (gameState === 'GAMEOVER') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 20);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px sans-serif';
        ctx.fillText('Press any key or Tap to Restart', canvas.width/2, canvas.height/2 + 40);
        ctx.textAlign = 'left';
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

init();
