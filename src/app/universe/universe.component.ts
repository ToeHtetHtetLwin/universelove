import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-universe',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './universe.component.html',
  styleUrl: './universe.component.css'
})
export class UniverseComponent implements AfterViewInit, OnDestroy {
  @ViewChild('galaxyContainer', { static: false }) containerRef!: ElementRef;

  public customerData: any = null;
  public isPlaying = false;
  public selectedText = "";
  private audio!: HTMLAudioElement;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private frameId: number | null = null;
  private photoMeshes: THREE.Mesh[] = [];
  private petalSystem!: THREE.Points;
  private selectedMesh: THREE.Mesh | null = null;

  constructor(
    private ngZone: NgZone, 
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  async ngAfterViewInit() {
    await this.loadCustomerData();
    if (this.customerData) {
      this.cdr.detectChanges(); 
      if (this.containerRef) {
        this.initThree();
        this.addStars();
        this.addPetals();
        this.addPhotoMeshes();
        this.animate();
      }
    }
  }

  private async loadCustomerData() {
    try {
      const response = await fetch('/customers.json');
      const data = await response.json();
      const id = this.route.snapshot.paramMap.get('id');
      this.customerData = data.customers.find((c: any) => c.id === (id || 'toe-htet'));

      if (this.customerData) {
        this.audio = new Audio(this.customerData.audioUrl);
        this.audio.loop = true;
      }
    } catch (err) {
      console.error("Data load failed", err);
    }
  }

  private initThree() {
    const isMobile = window.innerWidth < 768;
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      isMobile ? 85 : 75, 
      window.innerWidth / window.innerHeight, 
      0.1, 1000
    );
    this.camera.position.set(0, 5, isMobile ? 35 : 30);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // အရောင်တွေ ပိုမှန်အောင် colorSpace သတ်မှတ်ပေးခြင်း
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    this.containerRef.nativeElement.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.enablePan = false;
  }

  private addStars() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(5000 * 3);
    for (let i = 0; i < 5000 * 3; i++) pos[i] = (Math.random() - 0.5) * 120;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.1, color: 0xffffff });
    this.scene.add(new THREE.Points(geo, mat));
  }

  private addPetals() {
    const count = 300;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 80;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.6,
      color: 0xffe066,
      transparent: true,
      opacity: 0.8,
      map: new THREE.TextureLoader().load('/heart.png'),
      blending: THREE.AdditiveBlending
    });

    this.petalSystem = new THREE.Points(geo, mat);
    this.scene.add(this.petalSystem);
  }

  private addPhotoMeshes() {
    const loader = new THREE.TextureLoader();
    const isMobile = window.innerWidth < 768;
    const radius = isMobile ? 3.2 : 4.5;
    const spread = isMobile ? 10 : 16;

    this.customerData.photos.forEach((url: string, i: number) => {
      loader.load(url, (tex) => {
        // --- ORIGINAL COLOR & CLARITY ---
        // color ကို ဖြုတ်လိုက်ရင် default အတိုင်း လင်းလင်းချင်းချင်း ဖြစ်သွားပါမယ်။
        // colorSpace ကို sRGB ပြောင်းပေးတာက အရောင်ပိုကြည်စေပါတယ်။
        tex.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.MeshBasicMaterial({ 
          map: tex, 
          side: THREE.DoubleSide, 
          transparent: true,
          color: 0xffffff // Full Brightness (Original Color)
        });

        const mesh = new THREE.Mesh(
          new THREE.CircleGeometry(radius, 32),
          material
        );

        const angle = (i / this.customerData.photos.length) * Math.PI * 2;
        mesh.position.set(
          Math.cos(angle) * spread,
          (Math.random() - 0.5) * (isMobile ? 6 : 12),
          Math.sin(angle) * spread
        );
        this.photoMeshes.push(mesh);
        this.scene.add(mesh);
      });
    });
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent) {
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    const intersects = raycaster.intersectObjects(this.photoMeshes);

    if (intersects.length > 0) {
      this.selectedMesh = intersects[0].object as THREE.Mesh;
      const index = this.photoMeshes.indexOf(this.selectedMesh);
      this.selectedText = this.customerData.quotes[index] || "Love Forever ❤️";
    } else {
      this.selectedMesh = null;
      this.selectedText = "";
    }
  }

  toggleMusic(event: Event) {
    event.stopPropagation();
    if (!this.audio) return;
    this.isPlaying = !this.isPlaying;
    this.isPlaying ? this.audio.play() : this.audio.pause();
  }

  playMusic() {
    if (this.audio && !this.isPlaying) {
      this.isPlaying = true;
      this.audio.play();
    }
  }

  private animate() {
    this.ngZone.runOutsideAngular(() => {
      const loop = () => {
        this.frameId = requestAnimationFrame(loop);
        const time = Date.now() * 0.001;

        if (this.petalSystem) {
          const positions = this.petalSystem.geometry.attributes['position'].array as Float32Array;
          for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= 0.04;
            if (positions[i] < -40) positions[i] = 40;
          }
          this.petalSystem.geometry.attributes['position'].needsUpdate = true;
        }

        this.photoMeshes.forEach((mesh, index) => {
          mesh.lookAt(this.camera.position);
          if (mesh === this.selectedMesh) {
            const pulse = 1.25 + Math.sin(time * 5) * 0.05;
            mesh.scale.set(pulse, pulse, pulse);
          } else {
            mesh.scale.set(1, 1, 1);
            mesh.position.y += Math.sin(time + index) * 0.01;
          }
        });

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
      };
      loop();
    });
  }

  @HostListener('window:resize')
  onResize() {
    const isMobile = window.innerWidth < 768;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.fov = isMobile ? 85 : 75;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  ngOnDestroy() {
    if (this.frameId) cancelAnimationFrame(this.frameId);
    if (this.audio) this.audio.pause();
    this.renderer?.dispose();
  }
}