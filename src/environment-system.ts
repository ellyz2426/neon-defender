// Neon Defender VR — Environment System
import { createSystem, World, Scene, Mesh, PlaneGeometry, BoxGeometry, CylinderGeometry, SphereGeometry, MeshBasicMaterial, LineSegments, EdgesGeometry, LineBasicMaterial, AmbientLight, PointLight, FogExp2, DoubleSide } from '@iwsdk/core';

export class EnvironmentSystem extends createSystem({}) {
  init() {
    const w = (this as any).world as World;
    const scene = w.scene;

    // Fog
    scene.fog = new FogExp2('#000a14', 0.008);

    // Ambient light
    scene.add(new AmbientLight('#334466', 0.6));

    // Accent lights
    const pl = new PointLight('#00ffff', 1.5, 80);
    pl.position.set(0, 20, 10);
    scene.add(pl);
    const pl2 = new PointLight('#ff3366', 0.8, 60);
    pl2.position.set(-30, 10, 5);
    scene.add(pl2);

    // Grid floor
    const floorMat = new MeshBasicMaterial({ color: '#003344', transparent: true, opacity: 0.3, side: DoubleSide });
    const floor = new Mesh(new PlaneGeometry(200, 200), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.1;
    scene.add(floor);

    // Floor glow
    const glow = new Mesh(new PlaneGeometry(80, 80), new MeshBasicMaterial({ color: '#004455', transparent: true, opacity: 0.15, side: DoubleSide }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -0.05;
    scene.add(glow);

    // Grid lines
    const gridMat = new LineBasicMaterial({ color: '#004466', transparent: true, opacity: 0.4 });
    for (let i = -50; i <= 50; i += 5) {
      const geo = new BoxGeometry(100, 0.02, 0.02);
      const line = new Mesh(geo, new MeshBasicMaterial({ color: '#003344', transparent: true, opacity: 0.3 }));
      line.position.set(0, 0, i);
      scene.add(line);
      const line2 = new Mesh(new BoxGeometry(0.02, 0.02, 100), new MeshBasicMaterial({ color: '#003344', transparent: true, opacity: 0.3 }));
      line2.position.set(i, 0, 0);
      scene.add(line2);
    }

    // Pillars
    const pillarMat = new MeshBasicMaterial({ color: '#002233', transparent: true, opacity: 0.5 });
    const pillarEdge = new LineBasicMaterial({ color: '#00aacc', transparent: true, opacity: 0.6 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const px = Math.cos(angle) * 45;
      const pz = Math.sin(angle) * 45 - 10;
      const pillar = new Mesh(new CylinderGeometry(0.4, 0.4, 40, 6), pillarMat);
      pillar.position.set(px, 20, pz);
      scene.add(pillar);
      const edges = new LineSegments(new EdgesGeometry(new CylinderGeometry(0.45, 0.45, 40, 6)), pillarEdge);
      edges.position.copy(pillar.position);
      scene.add(edges);
      // Pillar caps
      const cap = new Mesh(new SphereGeometry(0.5, 6, 4), new MeshBasicMaterial({ color: '#00ccff', transparent: true, opacity: 0.7 }));
      cap.position.set(px, 40, pz);
      scene.add(cap);
    }

    // Ceiling lights
    const ceilMat = new MeshBasicMaterial({ color: '#005577', transparent: true, opacity: 0.4 });
    for (let i = 0; i < 4; i++) {
      const cl = new Mesh(new BoxGeometry(30, 0.15, 0.8), ceilMat);
      cl.position.set(0, 39, -15 + i * 10);
      scene.add(cl);
    }

    // Stars
    const starMat = new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 });
    for (let i = 0; i < 60; i++) {
      const star = new Mesh(new SphereGeometry(0.08, 3, 2), starMat);
      star.position.set(
        (Math.random() - 0.5) * 120,
        35 + Math.random() * 10,
        -20 - Math.random() * 30
      );
      scene.add(star);
    }
  }

  update() {}
}
