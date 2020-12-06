'use strict';

Physijs.scripts.worker = 'js/physijs_worker.js';
Physijs.scripts.ammo = '../js/ammo.js';

var initScene, initEventHandling, render, createTower, loader,
    renderer, render_stats, physics_stats, scene, dir_light, am_light, camera,
    table, blocks = [],
    table_material, block_material, intersect_plane,
    selected_block = null,
    mouse_position = new THREE.Vector3,
    block_offset = new THREE.Vector3,
    _i, _v3 = new THREE.Vector3;

initScene = function() {
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMapSoft = true;
    document.getElementById('viewport').appendChild(renderer.domElement);

    render_stats = new Stats();
    render_stats.domElement.style.position = 'absolute';
    render_stats.domElement.style.top = '1px';
    render_stats.domElement.style.zIndex = 100;
    document.getElementById('viewport').appendChild(render_stats.domElement);

    physics_stats = new Stats();
    physics_stats.domElement.style.position = 'absolute';
    physics_stats.domElement.style.top = '50px';
    physics_stats.domElement.style.zIndex = 100;
    document.getElementById('viewport').appendChild(physics_stats.domElement);

    scene = new Physijs.Scene({
        fixedTimeStep: 1 / 120
    });
    scene.setGravity(new THREE.Vector3(0, -30, 0));
    scene.addEventListener(
        'update',
        function() {

            if (selected_block !== null) {

                _v3.copy(mouse_position).add(block_offset).sub(selected_block.position).multiplyScalar(5);
                _v3.y = 0;
                selected_block.setLinearVelocity(_v3);

                _v3.set(0, 0, 0);
                for (_i = 0; _i < blocks.length; _i++) {
                    blocks[_i].applyCentralImpulse(_v3);
                }
            }

            scene.simulate(undefined, 1);
            physics_stats.update();
        }
    );

    camera = new THREE.PerspectiveCamera(
        35,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );
    camera.position.set(25, 20, 25);
    camera.lookAt(new THREE.Vector3(0, 7, 0));
    scene.add(camera);

    am_light = new THREE.AmbientLight(0x444444);
    scene.add(am_light);

    dir_light = new THREE.DirectionalLight(0xFFFFFF);
    dir_light.position.set(20, 30, -5);
    dir_light.target.position.copy(scene.position);
    dir_light.castShadow = true;
    dir_light.shadow.camera.left = -30;
    dir_light.shadow.camera.top = -30;
    dir_light.shadow.camera.right = 30;
    dir_light.shadow.camera.bottom = 30;
    dir_light.shadow.camera.near = 20;
    dir_light.shadow.camera.far = 200;
    dir_light.shadow.bias = -.001
    dir_light.shadow.mapSize.width = dir_light.shadow.mapSize.height = 2048;
    dir_light.shadowDarkness = .5;
    scene.add(dir_light);

    loader = new THREE.TextureLoader();

    table_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({
            map: loader.load('images/wood.jpg')
        }),
        .9,
        .2
    );
    table_material.map.wrapS = table_material.map.wrapT = THREE.RepeatWrapping;
    table_material.map.repeat.set(5, 5);

    block_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({
            map: loader.load('images/plywood.jpg')
        }),
        .4,
        .4
    );
    block_material.map.wrapS = block_material.map.wrapT = THREE.RepeatWrapping;
    block_material.map.repeat.set(1, .5);

    table = new Physijs.BoxMesh(
        new THREE.BoxGeometry(50, 1, 50),
        table_material,
        0, {
            restitution: .2,
            friction: .8
        }
    );
    table.position.y = -.5;
    table.receiveShadow = true;
    scene.add(table);

    createTower();

    intersect_plane = new THREE.Mesh(
        new THREE.PlaneGeometry(150, 150),
        new THREE.MeshBasicMaterial({
            opacity: 0,
            transparent: true
        })
    );
    intersect_plane.rotation.x = Math.PI / -2;
    scene.add(intersect_plane);

    initEventHandling();

    requestAnimationFrame(render);
    scene.simulate();
};

render = function() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    render_stats.update();
};

createTower = (function() {
    var block_length = 6,
        block_height = 1,
        block_width = 1.5,
        block_offset = 2,
        block_geometry = new THREE.BoxGeometry(block_length, block_height, block_width);

    return function() {
        var i, j, rows = 16,
            block;

        for (i = 0; i < rows; i++) {
            for (j = 0; j < 3; j++) {
                block = new Physijs.BoxMesh(block_geometry, block_material);
                block.position.y = (block_height / 2) + block_height * i;
                if (i % 2 === 0) {
                    block.rotation.y = Math.PI / 2.01;
                    block.position.x = block_offset * j - (block_offset * 3 / 2 - block_offset / 2);
                } else {
                    block.position.z = block_offset * j - (block_offset * 3 / 2 - block_offset / 2);
                }
                block.receiveShadow = true;
                block.castShadow = true;
                scene.add(block);
                blocks.push(block);
            }
        }
    }
})();

initEventHandling = (function() {
    var _vector = new THREE.Vector3,
        handleMouseDown, handleMouseMove, handleMouseUp;

    handleMouseDown = function(evt) {
        var ray, intersections;

        _vector.set(
            (evt.clientX / window.innerWidth) * 2 - 1,
            -(evt.clientY / window.innerHeight) * 2 + 1,
            1
        );

        _vector.unproject(camera);

        ray = new THREE.Raycaster(camera.position, _vector.sub(camera.position).normalize());
        intersections = ray.intersectObjects(blocks);

        if (intersections.length > 0) {
            selected_block = intersections[0].object;

            _vector.set(0, 0, 0);
            selected_block.setAngularFactor(_vector);
            selected_block.setAngularVelocity(_vector);
            selected_block.setLinearFactor(_vector);
            selected_block.setLinearVelocity(_vector);

            mouse_position.copy(intersections[0].point);
            block_offset.subVectors(selected_block.position, mouse_position);

            intersect_plane.position.y = mouse_position.y;
        }
    };

    handleMouseMove = function(evt) {

        var ray, intersection,
            i, scalar;

        if (selected_block !== null) {

            _vector.set(
                (evt.clientX / window.innerWidth) * 2 - 1,
                -(evt.clientY / window.innerHeight) * 2 + 1,
                1
            );
            _vector.unproject(camera);

            ray = new THREE.Raycaster(camera.position, _vector.sub(camera.position).normalize());
            intersection = ray.intersectObject(intersect_plane);
            mouse_position.copy(intersection[0].point);
        }

    };

    handleMouseUp = function(evt) {

        if (selected_block !== null) {
            _vector.set(1, 1, 1);
            selected_block.setAngularFactor(_vector);
            selected_block.setLinearFactor(_vector);

            selected_block = null;
        }

    };

    return function() {
        renderer.domElement.addEventListener('mousedown', handleMouseDown);
        renderer.domElement.addEventListener('mousemove', handleMouseMove);
        renderer.domElement.addEventListener('mouseup', handleMouseUp);
    };
})();

window.onload = initScene;