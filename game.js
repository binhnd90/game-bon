const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const keys = {
    ArrowLeft: false,
    ArrowRight: false,
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
        
        this.shootCooldown = 0;
        this.bombCooldown = 0;
        
        // Animation states
        this.animTime = 0;
        this.isShooting = false;
        this.shootTime = 0;
    }

    update() {
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

        this.x += this.vx;

        // Jump
        if (keys.x && !this.isJumping) {
            this.vy = this.jumpForce;
            this.isJumping = true;
            // Prevent repeating jump while holding
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
            bullets.push(new Bullet(this.x + (20 * this.dir), this.y - 40, this.dir));
            this.shootCooldown = 10;
            this.isShooting = true;
            this.shootTime = 10;
        }

        // Bomb throwing
        if (this.bombCooldown > 0) this.bombCooldown--;
        if (keys.b && this.bombCooldown <= 0) {
            bombs.push(new Bomb(this.x, this.y - 40, this.dir));
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
        ctx.scale(this.dir, 1); // Flip based on direction

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Procedural Stickman Animation
        const swing = Math.sin(this.animTime);
        const swing2 = Math.cos(this.animTime);
        
        let leftLegAngle = 0;
        let rightLegAngle = 0;
        let leftArmAngle = 0;
        let rightArmAngle = 0;

        if (this.isJumping) {
            leftLegAngle = Math.PI / 4;
            rightLegAngle = -Math.PI / 4;
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
        ctx.arc(0, -55, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#ffcc99'; // skin tone
        ctx.fill();
        ctx.stroke();

        // Body
        ctx.beginPath();
        ctx.moveTo(0, -45);
        ctx.lineTo(0, -25);
        ctx.stroke();

        // Legs
        const legLen = 25;
        // Left Leg
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(Math.sin(leftLegAngle) * legLen, -25 + Math.cos(leftLegAngle) * legLen);
        ctx.stroke();
        // Right Leg
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(Math.sin(rightLegAngle) * legLen, -25 + Math.cos(rightLegAngle) * legLen);
        ctx.stroke();

        // Arms
        const armLen = 20;
        
        // Gun Arm (Right Arm)
        ctx.beginPath();
        ctx.moveTo(0, -40);
        if (this.isShooting) {
            // Point straight forward
            ctx.lineTo(armLen, -40);
            
            // Draw simple gun
            ctx.fillStyle = '#333';
            ctx.fillRect(armLen, -42, 15, 4);
            ctx.fillRect(armLen, -42, 4, 8);
        } else {
            ctx.lineTo(Math.sin(rightArmAngle) * armLen, -40 + Math.cos(rightArmAngle) * armLen);
        }
        ctx.stroke();

        // Left Arm (background arm)
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.lineTo(Math.sin(leftArmAngle) * armLen, -40 + Math.cos(leftArmAngle) * armLen);
        ctx.stroke();

        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, dir) {
        this.x = x;
        this.y = y;
        this.vx = 15 * dir;
        this.width = 10;
        this.height = 4;
        this.active = true;
    }
    update() {
        this.x += this.vx;
        if (this.x < 0 || this.x > canvas.width) {
            this.active = false;
        }
    }
    draw(ctx) {
        ctx.fillStyle = '#ffeb3b'; // Yellow bullet
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
        this.timer = 60; // fuse
    }
    update() {
        this.x += this.vx;
        this.vy += GRAVITY;
        this.y += this.vy;

        if (this.y >= GROUND_Y) {
            this.y = GROUND_Y;
            this.vx *= 0.5; // friction
            this.vy *= -0.4; // bounce
        }

        this.timer--;
        if (this.timer <= 0) {
            this.explode();
        }
    }
    explode() {
        this.active = false;
        // Create explosion particles
        for(let i=0; i<20; i++) {
            particles.push(new Particle(this.x, this.y, 'orange'));
        }
        
        // Check enemy damage
        enemies.forEach(enemy => {
            let dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist < 100) {
                enemy.hp -= 5;
            }
        });
    }
    draw(ctx) {
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Spark
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
        this.hp = 3;
        this.active = true;
        this.animTime = Math.random() * 10;
    }
    update() {
        // Move towards player slowly
        let dx = player.x - this.x;
        if (Math.abs(dx) > 50) {
            this.x += Math.sign(dx) * 1.5;
            this.animTime += 0.15;
        } else {
            this.animTime = 0;
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
        
        let dir = Math.sign(player.x - this.x) || 1;
        ctx.scale(dir, 1);

        ctx.strokeStyle = '#006400'; // Dark green soldier
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
        ctx.lineTo(15, -35); // Aiming towards player
        ctx.stroke();
        
        // Rifle
        ctx.fillStyle = '#111';
        ctx.fillRect(5, -38, 25, 4);

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
    if (Math.random() < 0.02 && enemies.length < 5) {
        let x = Math.random() > 0.5 ? canvas.width + 50 : -50;
        enemies.push(new Enemy(x));
    }
}

function init() {
    player = new Player();
    gameLoop();
}

function update() {
    player.update();
    
    spawnEnemy();

    bullets.forEach(b => b.update());
    bombs.forEach(b => b.update());
    enemies.forEach(e => e.update());
    particles.forEach(p => p.update());

    // Collisions: Bullets hit enemies
    bullets.forEach(bullet => {
        enemies.forEach(enemy => {
            if (bullet.active && enemy.active) {
                // simple box collision around enemy body
                if (bullet.x > enemy.x - 15 && bullet.x < enemy.x + 15 &&
                    bullet.y > enemy.y - 65 && bullet.y < enemy.y) {
                    bullet.active = false;
                    enemy.hp -= 1;
                    particles.push(new Particle(bullet.x, bullet.y, '#ffeb3b'));
                }
            }
        });
    });

    // Remove inactive entities
    bullets = bullets.filter(b => b.active);
    bombs = bombs.filter(b => b.active);
    enemies = enemies.filter(e => e.active);
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
    
    enemies.forEach(e => e.draw(ctx));
    bullets.forEach(b => b.draw(ctx));
    bombs.forEach(b => b.draw(ctx));
    particles.forEach(p => p.draw(ctx));
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

init();
