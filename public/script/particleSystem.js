(function (exports) {
  function ParticleSystem(_amount, _size, _texture) {
    var amount = _amount || 1000;
    var size = _size || .02;
    var texture = _texture || "img/cat4.png";

    var noiseShader = ["vec3 mod289(vec3 x)",
      "{",
      "return x - floor(x * (1.0 / 289.0)) * 289.0;",
      "}",

      // "vec3 mod289(vec3 x)",
      // "{",
      // "  return x - floor(x * (1.0 / 289.0)) * 289.0;",
      // "}",

      "vec4 mod289(vec4 x)",
      "{",
      "  return x - floor(x * (1.0 / 289.0)) * 289.0;",
      "}",

      "vec4 permute(vec4 x)",
      "{",
      "  return mod289(((x*34.0)+1.0)*x);",
      "}",

      "vec4 taylorInvSqrt(vec4 r)",
      "{",
      "  return 1.79284291400159 - 0.85373472095314 * r;",
      "}",

      "vec3 fade(vec3 t) {",
      "  return t*t*t*(t*(t*6.0-15.0)+10.0);",
      "}",

      "float cnoise(vec3 P)",
      "{",
      "  vec3 Pi0 = floor(P); // Integer part for indexing",
      "  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1",
      "  Pi0 = mod289(Pi0);",
      "  Pi1 = mod289(Pi1);",
      "  vec3 Pf0 = fract(P); // Fractional part for interpolation",
      "  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0",
      "  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);",
      "  vec4 iy = vec4(Pi0.yy, Pi1.yy);",
      "  vec4 iz0 = Pi0.zzzz;",
      "  vec4 iz1 = Pi1.zzzz;",

      "  vec4 ixy = permute(permute(ix) + iy);",
      "  vec4 ixy0 = permute(ixy + iz0);",
      "  vec4 ixy1 = permute(ixy + iz1);",

      "  vec4 gx0 = ixy0 * (1.0 / 7.0);",
      "  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;",
      "  gx0 = fract(gx0);",
      "  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);",
      "  vec4 sz0 = step(gz0, vec4(0.0));",
      "  gx0 -= sz0 * (step(0.0, gx0) - 0.5);",
      "  gy0 -= sz0 * (step(0.0, gy0) - 0.5);",

      "  vec4 gx1 = ixy1 * (1.0 / 7.0);",
      "  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;",
      "  gx1 = fract(gx1);",
      "  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);",
      "  vec4 sz1 = step(gz1, vec4(0.0));",
      "  gx1 -= sz1 * (step(0.0, gx1) - 0.5);",
      "  gy1 -= sz1 * (step(0.0, gy1) - 0.5);",

      "  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);",
      "  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);",
      "  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);",
      "  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);",
      "  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);",
      "  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);",
      "  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);",
      "  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);",

      "  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));",
      "  g000 *= norm0.x;",
      "  g010 *= norm0.y;",
      "  g100 *= norm0.z;",
      "  g110 *= norm0.w;",
      "  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));",
      "  g001 *= norm1.x;",
      "  g011 *= norm1.y;",
      "  g101 *= norm1.z;",
      "  g111 *= norm1.w;",

      "  float n000 = dot(g000, Pf0);",
      "  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));",
      "  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));",
      "  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));",
      "  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));",
      "  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));",
      "  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));",
      "  float n111 = dot(g111, Pf1);",

      "  vec3 fade_xyz = fade(Pf0);",
      "  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);",
      "  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);",
      "  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); ",
      "  return 2.2 * n_xyz;",
      "}",

      "float pnoise(vec3 P, vec3 rep)",
      "{",
      "  vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period",
      "  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); // Integer part + 1, mod period",
      "  Pi0 = mod289(Pi0);",
      "  Pi1 = mod289(Pi1);",
      "  vec3 Pf0 = fract(P); // Fractional part for interpolation",
      "  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0",
      "  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);",
      "  vec4 iy = vec4(Pi0.yy, Pi1.yy);",
      "  vec4 iz0 = Pi0.zzzz;",
      "  vec4 iz1 = Pi1.zzzz;",

      "  vec4 ixy = permute(permute(ix) + iy);",
      "  vec4 ixy0 = permute(ixy + iz0);",
      "  vec4 ixy1 = permute(ixy + iz1);",

      "  vec4 gx0 = ixy0 * (1.0 / 7.0);",
      "  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;",
      "  gx0 = fract(gx0);",
      "  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);",
      "  vec4 sz0 = step(gz0, vec4(0.0));",
      "  gx0 -= sz0 * (step(0.0, gx0) - 0.5);",
      "  gy0 -= sz0 * (step(0.0, gy0) - 0.5);",

      "  vec4 gx1 = ixy1 * (1.0 / 7.0);",
      "  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;",
      "  gx1 = fract(gx1);",
      "  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);",
      "  vec4 sz1 = step(gz1, vec4(0.0));",
      "  gx1 -= sz1 * (step(0.0, gx1) - 0.5);",
      "  gy1 -= sz1 * (step(0.0, gy1) - 0.5);",

      "  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);",
      "  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);",
      "  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);",
      "  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);",
      "  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);",
      "  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);",
      "  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);",
      "  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);",

      "  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));",
      "  g000 *= norm0.x;",
      "  g010 *= norm0.y;",
      "  g100 *= norm0.z;",
      "  g110 *= norm0.w;",
      "  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));",
      "  g001 *= norm1.x;",
      "  g011 *= norm1.y;",
      "  g101 *= norm1.z;",
      "  g111 *= norm1.w;",

      "  float n000 = dot(g000, Pf0);",
      "  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));",
      "  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));",
      "  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));",
      "  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));",
      "  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));",
      "  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));",
      "  float n111 = dot(g111, Pf1);",

      "  vec3 fade_xyz = fade(Pf0);",
      "  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);",
      "  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);",
      "  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); ",
      "  return 2.2 * n_xyz;",
      "}"
    ].join("\n");

    var lightShader = {

      vertexShader: ["\
            uniform float time;\
            uniform float offz;\
            uniform float offer;\
            uniform float boing;\
            uniform float swirl;\
            uniform float pSize;\
            attribute float size;\
            attribute vec3 customColor;\
            varying vec3 vColor;\
            float rand(vec2 co){\
                return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\
            }\
            void main() {\
                float minus = 10.0-size*20.;\
                vColor = vec3(customColor.x*minus,customColor.x*minus,minus)*.2;\
                vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\
                vec3 rando = vec3(rand(vec2(mvPosition.x+time,mvPosition.y+time)));\
                float siner = mvPosition.x+mvPosition.y+mvPosition.z;\
                float ns =  cnoise(time*.1+vec3(mvPosition.x,mvPosition.y+10.,mvPosition.z+3.)*.06*boing);\
                float nsy = cnoise(100.+time*.1+mvPosition.xyz*.03*boing);\
                float ns2 =  cnoise(time*.1+vec3(mvPosition.x,mvPosition.y+10.,mvPosition.z+3.)*1.06*boing)*.3;\
                float nsy2 = cnoise(100.+time*.1+mvPosition.xyz*.03*boing)*.01;\
                vec3 ox = vec3(sin(time+mvPosition.x*.1),cos(time+mvPosition.y*.1),sin(mvPosition.z*.1));\
                float xyoff = abs(mvPosition.x) + abs(mvPosition.y);\
                gl_PointSize = 100.*size;\
                vec4 p = projectionMatrix * mvPosition;\
                gl_Position = p+swirl;\
            }\
            "].join("\n"),

      fragmentShader: ["\
                uniform float time;\
                uniform float pSize;\
                uniform float offz;\
                uniform float boing;\
                uniform float offer;\
                uniform float swirl;\
                uniform vec3 color;\
                uniform sampler2D texture;\
                varying vec3 vColor;\
                void main() {\
                    gl_FragColor = vec4( color * vColor.r, vColor.b );\
                    gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );\
                }\
                "].join("\n")
    };

    lightShader.attributes = {

      size: {
        type: 'f',
        value: null
      },
      customColor: {
        type: 'c',
        value: null
      }

    };

    lightShader.uniforms = {

      time: {
        type: 'f',
        value: 0
      },
      pSize: {
        type: 'f',
        value: 1
      },
      offz: {
        type: 'f',
        value: 5
      },
      boing: {
        type: 'f',
        value: 1
      },
      swirl: {
        type: 'f',
        value: 0
      },
      offer: {
        type: 'f',
        value: 5
      },
      color: {
        type: "c",
        value: new THREE.Color(0xffffff)
      },
      texture: {
        type: "t",
        value: THREE.ImageUtils.loadTexture(texture)
      }

    };

    var noiseShaderConcat = noiseShader + lightShader.vertexShader;

    var shaderMaterial = new THREE.ShaderMaterial({
      attributes: lightShader.attributes,
      uniforms: lightShader.uniforms,
      vertexShader: noiseShaderConcat,
      fragmentShader: lightShader.fragmentShader,
      rotation: Math.PI / 2,
      // blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
    });

    var particles = amount;
    var radius = size;

    var geo = new THREE.BufferGeometry();

    var positions = new Float32Array(particles * 3);
    var values_color = new Float32Array(particles * 3);
    var values_size = new Float32Array(particles);

    var color = new THREE.Color(0xffffff);

    for (var v = 0; v < particles; v++) {

      values_size[v] = size;

      positions[v * 3 + 0] = Math.sin(v * .1); //( Math.random() * 2 - 1 ) * radius;
      positions[v * 3 + 1] = Math.cos(v * .1); //1+( Math.random() * 2 - 1 ) * radius;
      positions[v * 3 + 2] = Math.sin(v * .1); //2+( Math.random() * 2 - 1 ) * radius;

      color.setHSL(v / particles, 1.0, .5);

      values_color[v * 3 + 0] = 1;
      values_color[v * 3 + 1] = 1;
      values_color[v * 3 + 2] = 1;

    }

    geo.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.addAttribute('customColor', new THREE.BufferAttribute(values_color, 3));
    geo.addAttribute('size', new THREE.BufferAttribute(values_size, 1));

    this.psys = new THREE.PointCloud(geo, shaderMaterial);
    this.psys.frustumCulled = false;

  }

  ParticleSystem.prototype.animate = function () {
    // for (var i = 0; i < this.psys.geometry.attributes.position.array.length; i++) {

    //   var pos = this.psys.geometry.attributes.position.array[i];
    //   this.psys.geometry.attributes.position.array[i] += (.5 - Math.random()) * .1;

    // }

    for (var q = 0; q < this.psys.geometry.attributes.size.array.length; q++) {
      if (this.psys.geometry.attributes.size.array[q] < .5)
        this.psys.geometry.attributes.size.array[q] += .01;
    }
    for (var q = 0; q < this.psys.geometry.attributes.position.array.length; q++) {
      this.psys.geometry.attributes.position.array[q] += Math.sin(this.psys.geometry.attributes.position.array[q] + q) * .001;
    }

    this.psys.geometry.attributes.size.needsUpdate = true;
    this.psys.geometry.attributes.position.needsUpdate = true;
    this.psys.material.uniforms.time.value = .1;

    // this.psys.material.uniforms.time.value = Math.random();
    // this.psys.material.uniforms.offz.value = Math.random()+15;
    // this.psys.material.uniforms.offer.value = Math.random();
    // this.psys.material.uniforms.pSize.value = Math.random();

    // this.psys.material.uniforms.boing.value = Math.random();//*mouseX*30;
  }

  exports.ParticleSystem = ParticleSystem;

})(this);