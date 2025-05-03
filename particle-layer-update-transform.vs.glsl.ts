const shader = `\
#version 300 es
#define SHADER_NAME particle-layer-update-transform-vertex-shader

precision highp float;

in vec3 sourcePosition;
out vec3 targetPosition;

uniform sampler2D bitmapTexture;

const vec2 DROP_POSITION = vec2(0);

bool isNaN(float value) {
  return !(value <= 0.f || 0.f <= value);
}

// Longitude wrapping allows rendering in a repeated MapView
// Without this it creates weird artifacts.
float wrapLongitude(float lng) {
  float wrappedLng = mod(lng + 180.f, 360.f) - 180.f;
  return wrappedLng;
}

float wrapLongitude(float lng, float minLng) {
  float wrappedLng = wrapLongitude(lng);
  if(wrappedLng < minLng) {
    wrappedLng += 360.f;
  }
  return wrappedLng;
}

float randFloat(vec2 seed) {
  return fract(sin(dot(seed.xy, vec2(12.9898f, 78.233f))) * 43758.5453f);
}

vec2 randPoint(vec2 seed) {
  return vec2(randFloat(seed + 1.3f), randFloat(seed + 2.1f));
}

vec2 pointToPosition(vec2 point) {
  point.y = smoothstep(0.f, 1.f, point.y);
  vec2 viewportBoundsMin = bitmap.viewportBounds.xy;
  vec2 viewportBoundsMax = bitmap.viewportBounds.zw;
  return mix(viewportBoundsMin, viewportBoundsMax, point);
}

bool isPositionInBounds(vec2 position, vec4 bounds) {
  vec2 boundsMin = bounds.xy;
  vec2 boundsMax = bounds.zw;
  float lng = wrapLongitude(position.x, boundsMin.x);
  float lat = position.y;
  return (boundsMin.x <= lng && lng <= boundsMax.x &&
    boundsMin.y <= lat && lat <= boundsMax.y);
}

bool isPositionInViewport(vec2 position) {
  return isPositionInBounds(position, bitmap.viewportBounds);
}

// Our texture is already in lng/lat, can just pull the coords without conversion.
vec2 getUV(vec2 pos) {
  return vec2((pos.x - bitmap.bounds[0]) / (bitmap.bounds[2] - bitmap.bounds[0]), (pos.y - bitmap.bounds[3]) / (bitmap.bounds[1] - bitmap.bounds[3]));
}

bool rasterHasValues(vec4 values) {
  if(bitmap.imageUnscale[0] < bitmap.imageUnscale[1]) {
    return values.a >= 1.f;
  } else {
    return !isNaN(values.x);
  }
}

vec2 rasterGetValues(vec4 colour) {
  if(bitmap.imageUnscale[0] < bitmap.imageUnscale[1]) {
    return mix(vec2(bitmap.imageUnscale[0]), vec2(bitmap.imageUnscale[1]), colour.xy);
  } else {
    return colour.xy;
  }
}

vec2 updatedPosition(vec2 position, vec2 speed) {
  float distortion = cos(radians(position.y));
  vec2 offset;
  offset = vec2(speed.x, speed.y * distortion);
  return position + offset;
}

void main() {
  float particleIndex = mod(float(gl_VertexID), bitmap.numParticles);
  float particleAge = floor(float(gl_VertexID) / bitmap.numParticles);

  // Update particles
  // Older particles are copied afterwards in buffer copy/swap.
  if(particleAge > 0.f) {
    return;
  }

  if(sourcePosition.xy == DROP_POSITION) {
    // New particles? New positions! So random l0l XD!!1
    vec2 particleSeed = vec2(particleIndex * bitmap.seed / bitmap.numParticles);
    vec2 point = randPoint(particleSeed);
    vec2 position = pointToPosition(point);
    targetPosition.xy = position;
    targetPosition.x = wrapLongitude(targetPosition.x);
    return;
  }

  if(bitmap.viewportZoomChangeFactor > 1.f && mod(particleIndex, bitmap.viewportZoomChangeFactor) >= 1.f) {
    // Drop when zooming out and start again.
    targetPosition.xy = DROP_POSITION;
    return;
  }

  if(abs(mod(particleIndex, bitmap.maxAge + 2.f) - mod(bitmap.time, bitmap.maxAge + 2.f)) < 1.f) {
    // Drop by bitmap.maxAge, +2 because only non-randomised pairs are rendered.
    targetPosition.xy = DROP_POSITION;
    return;
  }

  if(!isPositionInBounds(sourcePosition.xy, bitmap.bounds)) {
    // Drop out of bounds.
    targetPosition.xy = sourcePosition.xy;
    return;
  }

  if(!isPositionInViewport(sourcePosition.xy)) {
    // Drop out of viewport.
    targetPosition.xy = DROP_POSITION;
    return;
  }

  vec2 uv = getUV(sourcePosition.xy);
  vec4 bitmapColour = texture(bitmapTexture, uv);

  if(!rasterHasValues(bitmapColour)) {
    // Drop when no data in raster.
    targetPosition.xy = DROP_POSITION;
    return;
  }

  vec2 speed = rasterGetValues(bitmapColour) * bitmap.speedFactor;
  targetPosition.xy = updatedPosition(sourcePosition.xy, speed);
  targetPosition.x = wrapLongitude(targetPosition.x);
}
`;

export default shader;