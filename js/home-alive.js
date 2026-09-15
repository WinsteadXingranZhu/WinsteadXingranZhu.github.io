const hero = document.querySelector(".home-hero");
const mark = document.querySelector(".living-mark");
const canvas = document.querySelector(".elephant-aura");
const elephant = mark?.querySelector("img");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (hero && mark && canvas && elephant && !reduceMotion.matches) {
  const context = canvas.getContext("2d");
  const pointer = { active: false, x: 0, y: 0, energy: 0 };
  let canvasRect;
  let particles = [];
  let resizeFrame;
  let animationFrame;

  const sampleStarlight = (red, green, blue) => {
    if (red > green * 1.13 && red > blue * 1.2) return [222, 165, 75];
    if (green > red * 1.04 && green > blue * 1.08) return [112, 171, 153];
    if (blue > red * 1.04) return [105, 176, 199];
    return [204, 181, 119];
  };

  const buildParticles = () => {
    canvasRect = canvas.getBoundingClientRect();
    const imageRect = elephant.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(canvasRect.width * pixelRatio);
    canvas.height = Math.round(canvasRect.height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const sampler = document.createElement("canvas");
    const sampleWidth = 180;
    const sampleHeight = Math.round(sampleWidth * elephant.naturalHeight / elephant.naturalWidth);
    sampler.width = sampleWidth;
    sampler.height = sampleHeight;

    const sampleContext = sampler.getContext("2d", { willReadFrequently: true });
    sampleContext.drawImage(elephant, 0, 0, sampleWidth, sampleHeight);
    const pixels = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
    const candidates = [];

    for (let y = 2; y < sampleHeight - 2; y += 2) {
      for (let x = 2; x < sampleWidth - 2; x += 2) {
        const index = (y * sampleWidth + x) * 4;
        const alpha = pixels[index + 3];
        const brightness = pixels[index] + pixels[index + 1] + pixels[index + 2];
        if (alpha > 72 && brightness < 714) {
          candidates.push({
            color: sampleStarlight(pixels[index], pixels[index + 1], pixels[index + 2]),
            x,
            y
          });
        }
      }
    }

    const imageLeft = imageRect.left - canvasRect.left;
    const imageTop = imageRect.top - canvasRect.top;
    const centerX = imageLeft + imageRect.width / 2;
    const centerY = imageTop + imageRect.height / 2;

    particles = Array.from({ length: 86 }, (_, index) => {
      const source = candidates[Math.floor(Math.random() * candidates.length)];
      const baseX = imageLeft + source.x / sampleWidth * imageRect.width;
      const baseY = imageTop + source.y / sampleHeight * imageRect.height;
      const angle = Math.atan2(baseY - centerY, baseX - centerX);

      return {
        angle,
        baseX,
        baseY,
        color: source.color,
        depth: .45 + Math.random() * .9,
        phase: Math.random() * Math.PI * 2,
        radius: .95 + Math.random() * 1.25,
        spark: index % 7 === 0,
        speed: .35 + Math.random() * .45,
        vx: 0,
        vy: 0,
        x: baseX,
        y: baseY
      };
    });
  };

  const animate = (time) => {
    context.clearRect(0, 0, canvasRect.width, canvasRect.height);
    pointer.energy += ((pointer.active ? 1 : 0) - pointer.energy) * .035;
    const breath = .07 + Math.sin(time * .00055) * .018;
    const bloom = breath + pointer.energy * .86;

    particles.forEach((particle) => {
      const distance = 3 + particle.depth * 23 * bloom;
      const driftX = Math.sin(time * .0007 * particle.speed + particle.phase) * (1.2 + bloom * 2.4);
      const driftY = Math.cos(time * .00055 * particle.speed + particle.phase) * (1 + bloom * 1.8);
      const targetX = particle.baseX + Math.cos(particle.angle) * distance + driftX;
      const targetY = particle.baseY + Math.sin(particle.angle) * distance + driftY;

      particle.vx += (targetX - particle.x) * .018;
      particle.vy += (targetY - particle.y) * .018;

      if (pointer.active) {
        const deltaX = particle.x - pointer.x;
        const deltaY = particle.y - pointer.y;
        const pointerDistance = Math.hypot(deltaX, deltaY);
        if (pointerDistance < 86 && pointerDistance > 0) {
          const force = (1 - pointerDistance / 86) * .42;
          particle.vx += deltaX / pointerDistance * force;
          particle.vy += deltaY / pointerDistance * force;
        }
      }

      particle.vx *= .9;
      particle.vy *= .9;
      particle.x += particle.vx;
      particle.y += particle.vy;

      const twinkle = .55 + Math.sin(time * .0022 * particle.speed + particle.phase) * .45;
      const alpha = (.3 + particle.depth * .12 + pointer.energy * .32) * (.62 + twinkle * .38);
      const [red, green, blue] = particle.color;
      context.shadowBlur = 3.5 + twinkle * 4 + pointer.energy * 2.5;
      context.shadowColor = `rgba(${red}, ${green}, ${blue}, ${alpha * .8})`;
      context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
      const reach = particle.radius * (1.85 + twinkle * 1.95 + pointer.energy * .8);
      const waist = Math.max(.28, particle.radius * .28);
      context.beginPath();
      context.moveTo(particle.x, particle.y - reach);
      context.quadraticCurveTo(particle.x + waist, particle.y - waist, particle.x + reach, particle.y);
      context.quadraticCurveTo(particle.x + waist, particle.y + waist, particle.x, particle.y + reach);
      context.quadraticCurveTo(particle.x - waist, particle.y + waist, particle.x - reach, particle.y);
      context.quadraticCurveTo(particle.x - waist, particle.y - waist, particle.x, particle.y - reach);
      context.fill();

      context.shadowBlur = 0;
      context.fillStyle = `rgba(255, 253, 235, ${Math.min(.92, alpha + .24)})`;
      context.beginPath();
      context.arc(particle.x, particle.y, .48 + particle.radius * .22, 0, Math.PI * 2);
      context.fill();

      if (particle.spark && pointer.energy > .16) {
        const ray = reach * 1.65;
        context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${alpha * .65})`;
        context.lineWidth = .45;
        context.beginPath();
        context.moveTo(particle.x - ray, particle.y);
        context.lineTo(particle.x + ray, particle.y);
        context.moveTo(particle.x, particle.y - ray);
        context.lineTo(particle.x, particle.y + ray);
        context.stroke();
      }
    });

    animationFrame = requestAnimationFrame(animate);
  };

  const updatePointer = (event) => {
    canvasRect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - canvasRect.left;
    pointer.y = event.clientY - canvasRect.top;

    const imageRect = elephant.getBoundingClientRect();
    const centerX = imageRect.left + imageRect.width / 2;
    const centerY = imageRect.top + imageRect.height / 2;
    pointer.active = Math.hypot(event.clientX - centerX, event.clientY - centerY) < imageRect.width * .9;
  };

  const scheduleBuild = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(buildParticles);
  };

  hero.addEventListener("pointermove", updatePointer);
  hero.addEventListener("pointerleave", () => { pointer.active = false; });
  window.addEventListener("resize", scheduleBuild);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(animationFrame);
    } else {
      animationFrame = requestAnimationFrame(animate);
    }
  });

  const start = () => {
    buildParticles();
    animationFrame = requestAnimationFrame(animate);
  };

  if (elephant.complete) start();
  else elephant.addEventListener("load", start, { once: true });
}
