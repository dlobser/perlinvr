(function () {
  var initialCameraPosition = {
      x: 0,
      y: 1.82,
      z: 0
    },

    FOG = 250,
    MOVE_SPEED = 1,
    SLOW_SPEED = MOVE_SPEED / 2,

    // socket = io.connect('https://agile-brook-2507.herokuapp.com/'),
    socket = io.connect('http://localhost'),

    camera,
    head,
    scene,
    renderer,
    vrEffect,
    vrControls,
    vrMouse,

    keys = {
      forward: false,
      left: false,
      backward: false,
      right: false,
      w: false,
      a: false,
      s: false,
      d: false
    },
    moving = false,

    moveVector = new THREE.Vector3(),
    leftVector = new THREE.Vector3(),
    scratchVector = new THREE.Vector3(),
    leftRotateMatrix = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), Math.PI / 2),

    lookTarget = new THREE.Vector3(),
    lookLatitude = 0,
    lookLongitude = -Math.PI / 2,

    pickTargets = [],

    vrButton = document.getElementById('vr'),
    infobutton = document.getElementById('infobutton'),
    info = document.getElementById('info');

  var particleSystem;
  var stats;

  var socketInfo = {};
  otherInfo = null;

  var clock = new THREE.Clock();

  var brushButton, catButton;
  var brush = "brushButton";

  THREE.Clock.prototype.reset = function () {
    this.startTime = 0;
    this.oldTime = 0;
    this.elapsedTime = 0;
  };

  function startMoving() {
    if (!moving) {
      // start moving in whichever direction the camera is looking
      moveVector.set(0, 0, 1).applyQuaternion(camera.quaternion);

      //only move along the ground
      moveVector.setY(0).normalize();

      leftVector.copy(moveVector).applyMatrix4(leftRotateMatrix);
      moving = true;
    }
  }

  function stopMoving() {
    updatePosition();
    if (!keys.w && !keys.a && !keys.s && !keys.d) {
      moving = false;
    }
  }

  function updatePosition() {
    var delta = clock.getDelta(),
      cos;

    if (keys.a) { //look left
      lookLongitude -= Math.PI * delta / 10;
    } else if (keys.d) { //look right
      lookLongitude += Math.PI * delta / 10;
    }

    if (keys.w) { //look up
      lookLatitude = Math.min(0.8 * Math.PI / 2, lookLatitude + Math.PI * delta / 10);
    } else if (keys.s) { //look down
      lookLatitude = Math.max(-0.8 * Math.PI / 2, lookLatitude - Math.PI * delta / 10);
    }

    lookTarget.y = Math.sin(lookLatitude);
    cos = Math.cos(lookLatitude);
    lookTarget.x = cos * Math.cos(lookLongitude);
    lookTarget.z = cos * Math.sin(lookLongitude);
    camera.lookAt(lookTarget);

    if (moving) {
      if (keys.forward) {
        scratchVector.copy(moveVector).multiplyScalar(delta * MOVE_SPEED);
        head.position.add(scratchVector);
      } else if (keys.backward) {
        scratchVector.copy(moveVector).multiplyScalar(-delta * SLOW_SPEED);
        head.position.add(scratchVector);
      }

      if (keys.left) {
        scratchVector.copy(leftVector).multiplyScalar(delta * SLOW_SPEED);
        head.position.add(scratchVector);
      } else if (keys.right) {
        scratchVector.copy(leftVector).multiplyScalar(-delta * SLOW_SPEED);
        head.position.add(scratchVector);
      }

      vrMouse.update(); //only need this if the world is animating
    }
  }

  socket.on('broadcastInfo', function (data) {
    otherInfo = data;
    // console.log("receive from server someone's data " + data);
    // console.log( data);
  });

  function animate() {

    removeLines();

    updatePosition();
    vrControls.update();
    // console.log(otherInfo.pos);
    if (otherInfo !== null) {
      // console.log(otherInfo.quat);
      otherHead.quaternion.x = otherInfo.quat._x;
      otherHead.quaternion.y = otherInfo.quat._y;
      otherHead.quaternion.z = otherInfo.quat._z;
      otherHead.quaternion.w = otherInfo.quat._w;
      // otherHead.quaternion.copy(otherInfo.quat);
      var vec = new THREE.Vector3(otherInfo.pos.x, otherInfo.pos.y, otherInfo.pos.z);
      // otherInfo.pos;
      vec.multiplyScalar(2);
      otherHead.position = vec;
      otherHead.position.x = -vec.x;
      otherHead.position.y = vec.y;
      otherHead.position.z = vec.z;
      // // console.log(otherHead.position);
      if (otherInfo.curves.length > 0) {

        // console.log(otherInfo.curves);
        var tempCurves = [];
        for (var i = 0; i < otherInfo.curves.length; i++) {
          var tCurve = [];
          for (var j = 0; j < otherInfo.curves[i].length; j++) {
            tCurve.push(new THREE.Vector3(otherInfo.curves[i][j].x, otherInfo.curves[i][j].y, otherInfo.curves[i][j].z));
          }
          tempCurves.push(tCurve);
        }
        // for(var i = 0 ; i < curves.length ; i++){
        //  tempCurves.push(curves[i]);
        // }
        tempCurves.redraw = true;
        drawLine(tempCurves);
        // drawLine(curves);
        // console.log(tempCurves);
        // console.log(curves);
      }
      // else
      //  drawLine(curves);
    } else {
      otherHead.quaternion.copy(camera.quaternion);
      var vec = camera.position.clone();
      vec.multiplyScalar(2);
      otherHead.position = vec;
      otherHead.position.x = -vec.x;
      otherHead.position.y = vec.y;
      otherHead.position.z = vec.z;
      curves.redraw = true;
      //console.log(curves);

    }
    curves.redraw = true;
    drawLine(curves);

    socketInfo.quat = camera.quaternion;
    socketInfo.pos = camera.position;
    socketInfo.curves = curves;
    socketInfo.id = Math.random();

    //console.log(socketInfo);
    socket.emit('socketInfo', socketInfo);
    // console.log(curves);
    // console.log(otherHead.position);
    // otherHead.quaternion.x+=.4;
    vrEffect.render(scene, camera);

    // for( var i = 0; i < psys.geometry.attributes.position.array.length; i++ ) {

    //     psys.geometry.attributes.position.array[i] += (.5-Math.random())*.1;

    // }
    particleSystem.animate();
    //   for(var q = 0 ; q < psys.geometry.attributes.size.array.length ; q++){
    //     if(psys.geometry.attributes.size.array[q]<.5)
    //         psys.geometry.attributes.size.array[q]+=.01;
    //   }
    //   for(var q = 0 ; q < psys.geometry.attributes.position.array.length ; q++){
    //     psys.geometry.attributes.position.array[q]+=Math.sin(psys.geometry.attributes.position.array[q]+q)*.001;
    //   }

    // psys.geometry.attributes.size.needsUpdate = true;
    // psys.geometry.attributes.position.needsUpdate = true;
    // psys.material.uniforms.time.value =.1;
    // psys.material.uniforms.offz.value = Math.random()+15;
    // psys.material.uniforms.offer.value +=3.3;
    // psys.material.uniforms.pSize.value = Math.random();

    // psys.material.uniforms.boing.value = Math.random();//*mouseX*30;

    if (catButton.startCounting) {
      catButton.counter++;
    }

    if (catButton.counter > 10) {
      catButton.material.color.setHex(0xffffff);
      catButton.counter = 0;
      catButton.startCounting = false;
    }

    if (brushButton.startCounting) {
      brushButton.counter++;
    }

    if (brushButton.counter > 10) {
      brushButton.material.color.setHex(0xffffff);
      brushButton.counter = 0;
      brushButton.startCounting = false;
    }

    stats.update();
    requestAnimationFrame(animate);
  }

  function initScene() {

    oldLines = new THREE.Object3D();

    eyeBall = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 10), new THREE.MeshLambertMaterial({
      color: 0x111111
    }));
    eyeBall.position.z = -.6;
    eyeBall.position.x = -.2;
    eyeBall2 = eyeBall.clone();
    eyeBall2.position.x = .2;

    mouth = new THREE.Mesh(new THREE.BoxGeometry(.5, .03, .02), new THREE.MeshLambertMaterial({
      color: 0x111111
    }));
    mouth.position.z = -.5;
    mouth.position.y = -.2;
    otherHead = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial());
    otherHead.add(eyeBall);
    otherHead.add(eyeBall2);
    otherHead.add(mouth);
    otherHeadParent = new THREE.Object3D();
    otherHeadParent.add(otherHead);
    otherHeadParent.position.z = 3;
    otherHeadParent.position.y = 2;

    lines = new THREE.Object3D();

    renderer = new THREE.WebGLRenderer();

    scene = new THREE.Scene();
    scene.add(otherHeadParent);

    //scene.add(setupParticles());
    particleSystem = new ParticleSystem();
    scene.add(particleSystem.psys);

    scene.add(lines);
    linePickSetup();
    scene.fog = new THREE.Fog(0xffffff, FOG * 0.9, FOG);

    head = new THREE.Object3D();
    head.rotateY(Math.PI);
    head.position.x = initialCameraPosition.x;
    head.position.y = initialCameraPosition.y;
    head.position.z = initialCameraPosition.z;
    scene.add(head);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, FOG * 2 + 1);
    head.add(camera);

    // BOXEN
    var boxGeo = new THREE.BoxGeometry(2, 15, 2);
    for (var i = 0; i < 40; i++) {
      var box = new THREE.Mesh(boxGeo,
        new THREE.MeshLambertMaterial({
          color: (new THREE.Color()).setHSL(Math.random() * .1, 0.7, 0.25)
        })
      );
      var angle = Math.PI * i / 20;
      box.position.set(
        Math.cos(angle) * 10,
        Math.sin(angle * 8) - 2,
        Math.sin(angle) * 10
      );
      box.receiveShadow = true;
      //console.log(box.position.x, box.position.y, box.position.z)
      scene.add(box);
      pickTargets.push(box);
    }

    curves = [];

    draw = false;
    var newLine = true;

    vrMouse = new THREE.VRMouse(camera, pickTargets, {
      element: renderer.domElement,
      near: 1,
      draw: false,
      newLine: true,
      // check: 12,
      onMouseOver: function (obj) {
        //console.log('hover', obj);
      },
      onMouseOut: function (obj) {
        //console.log('stop hover', obj);
      },
      onClick: function (intersection) {
        // console.log(this.check);
        // var box = new THREE.Mesh( boxGeo,
        //  new THREE.MeshLambertMaterial({
        //    color: (new THREE.Color()).setHSL(Math.random(), 0.7, 0.25)
        //  })
        // );
        // box.scale.set(0.2, 0.2, 0.2);
        // box.position.copy(intersection.point);
        // scene.add(box);
        // pickTargets.push(box);
        // this.draw=!this.draw;
        // console.log(this.draw);
        console.log(intersection.object);
        if (intersection.object.name === "cat") {
          console.log("meow!~~~~~");
          catButton.material.color.setHex(0xff0000);
          catButton.startCounting = true;
          brush = "cat";
        } else if (intersection.object.name === "brush") {
          console.log("brush!~~~~~");
          brushButton.material.color.setHex(0xff0000);
          brushButton.startCounting = true;
          brush = "brush";
        }
        if (intersection) {
          newCurve.redraw = true;
          newCurve.push(intersection.point);
          if (!newCurve.age)
            newCurve.age = 0;
        }
      },
      onMouseDown: function () {
        draw = true;
        if (newLine) {
          newCurve = [];
          curves.push(newCurve);
        }
        newLine = false;
      },
      onMouseUp: function () {
        draw = false;
        newLine = true;
        newCurve.redraw = false;
        curves.redraw = false;

      },
      onMouseMove: function (intersection) {
        if (draw) {
          curves.redraw = true;
          // console.log(intersection.point);

        }
      }
    });

    scene.add(vrMouse.pointer);
    renderer.domElement.addEventListener('click', function () {
      vrMouse.lock();
    });

    vrControls = new THREE.VRControls(camera);
    vrControls.freeze = true;

    floorTexture = THREE.ImageUtils.loadTexture('img/rainbow_piece.png');
    floorTexture.anisotropy = renderer.getMaxAnisotropy();
    // floorTexture.wrapS = THREE.RepeatWrapping;
    // floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.mapping = THREE.CubeReflectionMapping;
    // floorTexture.repeat.set(24,24);

    var floor = new THREE.Mesh(
      new THREE.CircleGeometry(FOG / 8, 32),
      new THREE.MeshPhongMaterial({
        color: 0x999999,
        specular: 0x111111,
        map: floorTexture,
        shininess: 100,
        shading: THREE.SmoothShading
      })
    );
    floor.name = 'floor';
    floor.receiveShadow = true;
    floor.rotateX(-Math.PI / 2);
    scene.add(floor);
    pickTargets.push(floor);

    var sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshLambertMaterial({
        color: 0x5588ee
      })
    );
    sphere.position.set(0, 10, 4);
    sphere.name = 'sphere';
    scene.add(sphere);
    pickTargets.push(sphere);

    var directionalLight = new THREE.DirectionalLight(0xffffff, 1.475);
    directionalLight.position.set(100, 100, -100);
    scene.add(directionalLight);

    var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.25);
    hemiLight.color.setHSL(0.6, 0.0, 0.5);
    hemiLight.groundColor.setHSL(0.1, 0.0, 0.3);
    hemiLight.position.y = 500;
    scene.add(hemiLight);

    // SKYDOME

    var vertexShader = document.getElementById('vertexShader').textContent;
    var fragmentShader = document.getElementById('fragmentShader').textContent;
    var uniforms = {
      topColor: {
        type: "c",
        value: new THREE.Color(0x0077ff)
      },
      bottomColor: {
        type: "c",
        value: new THREE.Color(0xffffff)
      },
      offset: {
        type: "f",
        value: FOG / 10
      },
      exponent: {
        type: "f",
        value: 0.6
      }
    };
    uniforms.topColor.value.copy(hemiLight.color);

    scene.fog.color.copy(uniforms.bottomColor.value);

    var skyGeo = new THREE.SphereGeometry(FOG * 2, 32, 15);
    var skyMat = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
      side: THREE.BackSide
    });

    var sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
    //console.log(sky.position.x, sky.position.y, sky.position.z)
    pickTargets.push(sky);

    //BUTTONS
    geometry = new THREE.PlaneGeometry(.3, .3);
    var catTexture = THREE.ImageUtils.loadTexture('img/cat4.png');
    material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      map: catTexture,
      //blending: THREE.AdditiveBlending,
      transparent: true
    });
    catButton = new THREE.Mesh(geometry, material);
    catButton.rotation.x = Math.PI;
    catButton.position.y = 1.5;
    catButton.position.z = 1.4;
    catButton.position.x = -1;
    catButton.name = "cat";
    catButton.counter = 0;
    catButton.startCounting = false;
    scene.add(catButton);
    pickTargets.push(catButton);

    var brushTexture = new THREE.ImageUtils.loadTexture('img/brush.png');
    material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      map: brushTexture,
      //blending: THREE.AdditiveBlending,
      transparent: true
    });
    brushButton = new THREE.Mesh(geometry, material);
    brushButton.rotation.x = Math.PI;
    brushButton.position.y = 1.9;
    brushButton.position.z = 1.4;
    brushButton.position.x = -1;
    brushButton.name = "brush";
    brushButton.counter = 0;
    brushButton.startCounting = false;
    scene.add(brushButton);
    pickTargets.push(brushButton);

    renderer.setClearColor(scene.fog.color, 1);
    renderer.shadowMapType = THREE.PCFSoftShadowMap;
    renderer.shadowMapEnabled = true;

    document.body.appendChild(renderer.domElement);

    vrEffect = new THREE.VRStereoEffect(renderer);
    vrEffect.addEventListener('fullscreenchange', function () {
      vrControls.freeze = !(vrEffect.isFullscreen() || vrEffect.vrPreview());
      if (vrControls.freeze) {
        vrControls.reset();
      } else {
        vrMouse.lock();
      }
    });
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    //todo: renderer.setSize(width, height);
  }

  function init() {
    socket.emit('Hey', {
      my: 'Whats up'
    });
    initScene();

    resize();
    window.addEventListener('resize', resize, false);

    vrButton.addEventListener('click', function () {
      vrEffect.requestFullScreen();
    }, false);

    //todo: set up button to trigger full screen
    window.addEventListener('keydown', function (evt) {
      console.log('keydown', evt.keyCode);
      if (evt.keyCode === 38) { //up
        keys.forward = true;
        startMoving();
      } else if (evt.keyCode === 40) { //down
        keys.backward = true;
        startMoving();
      } else if (evt.keyCode === 37) { //left
        keys.left = true;
        startMoving();
      } else if (evt.keyCode === 39) { //right
        keys.right = true;
        startMoving();
      } else if (evt.keyCode === 'W'.charCodeAt(0)) {
        keys.w = true;
      } else if (evt.keyCode === 'A'.charCodeAt(0)) {
        keys.a = true;
      } else if (evt.keyCode === 'S'.charCodeAt(0)) {
        keys.s = true;
      } else if (evt.keyCode === 'D'.charCodeAt(0)) {
        keys.d = true;
      } else if (evt.keyCode === 'Z'.charCodeAt(0)) {
        vrControls.zeroSensor();
      } else if (evt.keyCode === 'P'.charCodeAt(0)) {
        if (!vrEffect.isFullscreen()) {
          vrEffect.vrPreview(!vrEffect.vrPreview());
          vrControls.freeze = !vrEffect.vrPreview();
          if (vrControls.freeze) {
            vrControls.reset();
          }
        }
      } else if (evt.keyCode === 187 || evt.keyCode === 61) { //+
        //resizeFOV(0.1);
      } else if (evt.keyCode === 189 || evt.keyCode === 173) { //-
        //resizeFOV(-0.1);
      } else if (evt.keyCode === 13) {
        vrEffect.requestFullScreen();
      }
    }, false);

    window.addEventListener('keyup', function (evt) {
      if (evt.keyCode === 38) { //up
        keys.forward = false;
        stopMoving();
      } else if (evt.keyCode === 40) { //down
        keys.backward = false;
        stopMoving();
      } else if (evt.keyCode === 37) { //left
        keys.left = false;
        stopMoving();
      } else if (evt.keyCode === 39) { //right
        keys.right = false;
        stopMoving();
      } else if (evt.keyCode === 'W'.charCodeAt(0)) {
        keys.w = false;
      } else if (evt.keyCode === 'A'.charCodeAt(0)) {
        keys.a = false;
      } else if (evt.keyCode === 'S'.charCodeAt(0)) {
        keys.s = false;
      } else if (evt.keyCode === 'D'.charCodeAt(0)) {
        keys.d = false;
      } else if (evt.keyCode === 32) { //space
        vrMouse.center();
      }
    }, false);

    window.addEventListener('touchend', function () {
      vrEffect.requestFullScreen();
    });

    document.addEventListener('wheel', function (e) {
      vrMouse.fixedDistance -= e.deltaY / 100;
    }, false);

    infobutton.addEventListener('click', function () {
      if (info.className) {
        info.className = '';
      } else {
        info.className = 'open';
      }
    });

    setTimeout(function () {
      if (vrEffect.hmd()) {
        vrButton.disabled = false;
      }
    }, 1);

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    stats.domElement.style.right = '0px';
    document.body.appendChild(stats.domElement);
  }

  function linePickSetup() {
    plane2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 10, 10, 10), new THREE.MeshLambertMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: .1,
      emissive: 0x99DDFF
    }));
    plane2.rotation.x = Math.PI;
    plane2.position.z = 2;
    plane2.position.y = 1;
    scene.add(plane2);
    // var sp = new THREE.Mesh(new THREE.PlaneGeometry( 1,1,1,1),new THREE.MeshLambertMaterial(  ));
    // sp.rotation.x = Math.PI;
    //  sp.position.z=2;
    // scene.add(sp)
    pickTargets.push(plane2);

  }

  function removeLines() {

    if (lines) {
      scene.remove(lines);
      lines.traverse(function (obj) {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          obj.material.dispose();
        }
        obj = null;
      });
    }
    // console.log(lines.children.length);

    lines = new THREE.Object3D();
    scene.add(lines);

    if (curves.length > 5) {
      curves.shift();
    }

    for (var i = 0; i < curves.length; i++) {
      if (!curves[i].redraw)
        curves[i].age++;
      else
        curves[i].age++;
      if (i < curves.length - 1 && curves[i].age > 1000) {
        curves.splice(i, 1);
      }
      if (curves[i].length > 100) {
        curves[i].shift();
      }
    }
    // console.log('curves');

  }

  function drawLine(arr) {

    // removeLines();
    var geom = new THREE.PlaneGeometry(.1, .1, 1, 1);
    var mata = new THREE.MeshLambertMaterial({
      color: 0x555555,
      side: THREE.DoubleSide
    });

    if (arr.redraw === true) {

      if (arr.length > 0) {
        for (var i = 0; i < arr.length; i++) {
          if (arr[i].length > 3) {
            var tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.SplineCurve3(arr[i]), arr[i].length, Math.max(.1, .3 - (.0001 + arr[i].age * .004))), new THREE.MeshLambertMaterial({
              color: 0xffffff,
              map: floorTexture
            }));
            lines.add(tube);
            // for(var j=0 ; j<arr[i].length ; j++){

            //   var mesh = new THREE.Mesh(geom,mata);
            //   mesh.position.x = arr[i][j].x;
            //   mesh.position.y = arr[i][j].y;
            //   mesh.position.z = arr[i][j].z;

            //   if(!arr[i][j].age)
            //     arr[i][j].age=0.001;
            //   else
            //     arr[i][j].age++;

            //     mesh.position.x += .1*(Math.sin(Math.PI*2*noise(arr[i][j].x,arr[i][j].y,arr[i][j].z)*arr[i][j].age*.1));
            //   mesh.position.y += .1*(Math.cos(Math.PI*2*noise(arr[i][j].x,arr[i][j].y,arr[i][j].z)*arr[i][j].age*.1));
            //   mesh.position.z += .1*(Math.sin(Math.PI*2*noise(arr[i][j].x,arr[i][j].y,arr[i][j].z)*arr[i][j].age*.1));

            //   // var up = (j/arr[i].length)*5;
            //   // mesh.scale.multiply(new THREE.Vector3(up,up,up));
            //   mesh.scale.multiplyScalar(Math.max(.001,2-(.0001+arr[i][j].age*.051)));

            //   // console.log(mesh.position);

            //   // console.log(lines.children.length);         //
            //   lines.add(mesh);
            //   // scene.add(mesh);

            // }
            //
            if (typeof counter === 'undefined')
              counter = 0;
            // else
            //   counter++;

            if (arr[i].length > 1 && draw) {
              for (var j = arr[i].length - 1; j < arr[i].length; j++) {

                if (counter + 60 > particleSystem.psys.geometry.attributes.position.array.length)
                  counter = 0;
                else
                  counter += 30;

                var p = counter / 3;

                for (var k = counter; k < counter + 30; k += 3) {

                  particleSystem.psys.geometry.attributes.position.array[k] = arr[i][j].x + Math.random() * .1;
                  particleSystem.psys.geometry.attributes.position.array[k + 1] = arr[i][j].y + Math.random() * .1;
                  particleSystem.psys.geometry.attributes.position.array[k + 2] = arr[i][j].z + Math.random() * .1;

                  particleSystem.psys.geometry.attributes.size.array[p] = .02;

                  p++;

                }

              }
            }

          }
        }
      }
    }
  }

  window.onkeyup = onKeyUp;

  function onKeyUp(evt) {

    if (evt.keyCode == 69) {
      console.log(curves);
      curves = [];
    }

  }

  init();
  animate();

  var noise = function (ix, iy, iz) {

    var x = ix || 0;
    var y = iy || 0;
    var z = iz || 0;
    var X = Math.floor(x) & 255,
      Y = Math.floor(y) & 255,
      Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    var u = fade(x),
      v = fade(y),
      w = fade(z);
    var A = p[X] + Y,
      AA = p[A] + Z,
      AB = p[A + 1] + Z, // HASH COORDINATES OF
      B = p[X + 1] + Y,
      BA = p[B] + Z,
      BB = p[B + 1] + Z; // THE 8 CUBE CORNERS,
    return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z), // AND ADD
          grad(p[BA], x - 1, y, z)), // BLENDED
        lerp(u, grad(p[AB], x, y - 1, z), // RESULTS
          grad(p[BB], x - 1, y - 1, z))), // FROM  8
      lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), // CORNERS
          grad(p[BA + 1], x - 1, y, z - 1)), // OF CUBE
        lerp(u, grad(p[AB + 1], x, y - 1, z - 1),
          grad(p[BB + 1], x - 1, y - 1, z - 1))));
  };

  function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  };

  function lerp(t, a, b) {
    return a + t * (b - a);
  };

  function grad(hash, x, y, z) {
    var h = hash & 15; // CONVERT LO 4 BITS OF HASH CODE
    var u = h < 8 ? x : y, // INTO 12 GRADIENT DIRECTIONS.
      v = h < 4 ? y : h == 12 || h == 14 ? x : z;
    return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
  };
  var p = [151, 160, 137, 91, 90, 15,
    131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
    190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
    88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
    77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
    102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
    135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
    5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
    223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
    129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
    251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
    49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
    138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
  ];
  for (var i = 0; i < 256; i++) p.push(p[i]);
}());