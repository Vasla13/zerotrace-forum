export function getAvatarInitial(username: string) {
  return username.trim().charAt(0).toUpperCase() || "?";
}

export function getAvatarPalette(seed: string) {
  const hash = seed.split("").reduce((total, character) => {
    return character.charCodeAt(0) + ((total << 5) - total);
  }, 11);

  const hue = Math.abs(hash) % 360;
  const secondHue = (hue + 28) % 360;

  return {
    background: `linear-gradient(135deg, hsl(${hue} 76% 68%), hsl(${secondHue} 70% 52%))`,
    shadow: `hsla(${hue} 80% 35% / 0.28)`,
  };
}
