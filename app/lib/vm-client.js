// GentlyOS VM Client - Virtual Machine Management
// Manage VMs for test networks, isolated environments, and development

const { EventEmitter } = require('events');
const { spawn, exec } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const net = require('net');

// VM backends
const VM_BACKEND = {
  QEMU: 'qemu',
  LIBVIRT: 'libvirt',
  VIRTUALBOX: 'virtualbox',
  DOCKER: 'docker',
  PODMAN: 'podman',
};

// VM state
const VM_STATE = {
  STOPPED: 'stopped',
  STARTING: 'starting',
  RUNNING: 'running',
  PAUSED: 'paused',
  SAVING: 'saving',
  RESTORING: 'restoring',
  SHUTTING_DOWN: 'shutting-down',
  ERROR: 'error',
};

// OS types
const OS_TYPE = {
  LINUX: 'linux',
  WINDOWS: 'windows',
  BSD: 'bsd',
  MACOS: 'macos',
  OTHER: 'other',
};

// Network modes
const NETWORK_MODE = {
  NAT: 'nat',
  BRIDGE: 'bridge',
  HOST_ONLY: 'host-only',
  ISOLATED: 'isolated',
  NONE: 'none',
};

// Generate ID
function generateId(prefix = 'vm') {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

// Virtual Machine definition
class VirtualMachine {
  constructor(data = {}) {
    this.id = data.id || generateId();
    this.name = data.name || 'Untitled VM';
    this.description = data.description || '';
    this.backend = data.backend || VM_BACKEND.QEMU;
    this.state = VM_STATE.STOPPED;
    this.osType = data.osType || OS_TYPE.LINUX;
    this.osVariant = data.osVariant || 'generic';

    // Hardware
    this.cpuCores = data.cpuCores || 2;
    this.cpuModel = data.cpuModel || 'host';
    this.ramMB = data.ramMB || 2048;
    this.vramMB = data.vramMB || 16;

    // Storage
    this.disks = data.disks || [];
    this.cdrom = data.cdrom || null;

    // Network
    this.networkMode = data.networkMode || NETWORK_MODE.NAT;
    this.networkBridge = data.networkBridge || 'virbr0';
    this.macAddress = data.macAddress || this._generateMac();
    this.portForwards = data.portForwards || [];

    // Display
    this.display = data.display || 'spice'; // spice, vnc, gtk, none
    this.vncPort = data.vncPort || null;
    this.spicePort = data.spicePort || null;

    // QEMU options
    this.enableKVM = data.enableKVM !== false;
    this.enableUEFI = data.enableUEFI || false;
    this.machineType = data.machineType || 'q35';
    this.extraArgs = data.extraArgs || [];

    // Runtime
    this.process = null;
    this.pid = null;
    this.startTime = null;
    this.ip = null;
    this.sshPort = data.sshPort || null;

    // Metadata
    this.createdAt = data.createdAt || Date.now();
    this.metadata = data.metadata || {};
  }

  _generateMac() {
    const bytes = crypto.randomBytes(6);
    bytes[0] = (bytes[0] & 0xfe) | 0x02; // Set local bit, clear multicast
    return bytes.toString('hex').match(/.{2}/g).join(':');
  }

  addDisk(disk) {
    this.disks.push({
      path: disk.path,
      size: disk.size || '20G',
      format: disk.format || 'qcow2',
      bus: disk.bus || 'virtio',
      bootable: disk.bootable || false,
    });
    return this;
  }

  addPortForward(hostPort, guestPort, protocol = 'tcp') {
    this.portForwards.push({ hostPort, guestPort, protocol });
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      backend: this.backend,
      state: this.state,
      osType: this.osType,
      osVariant: this.osVariant,
      cpuCores: this.cpuCores,
      ramMB: this.ramMB,
      disks: this.disks,
      cdrom: this.cdrom,
      networkMode: this.networkMode,
      macAddress: this.macAddress,
      portForwards: this.portForwards,
      display: this.display,
      vncPort: this.vncPort,
      spicePort: this.spicePort,
      pid: this.pid,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime : null,
      ip: this.ip,
      sshPort: this.sshPort,
      createdAt: this.createdAt,
    };
  }
}

// Network definition for test networks
class TestNetwork {
  constructor(data = {}) {
    this.id = data.id || generateId('net');
    this.name = data.name || 'test-network';
    this.cidr = data.cidr || '10.0.0.0/24';
    this.gateway = data.gateway || '10.0.0.1';
    this.dhcpStart = data.dhcpStart || '10.0.0.100';
    this.dhcpEnd = data.dhcpEnd || '10.0.0.200';
    this.bridge = data.bridge || `virbr-${this.id.slice(-4)}`;
    this.isolated = data.isolated || false;
    this.vms = new Set();
    this.active = false;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      cidr: this.cidr,
      gateway: this.gateway,
      dhcpStart: this.dhcpStart,
      dhcpEnd: this.dhcpEnd,
      bridge: this.bridge,
      isolated: this.isolated,
      vmCount: this.vms.size,
      active: this.active,
    };
  }
}

// Snapshot
class VMSnapshot {
  constructor(data = {}) {
    this.id = data.id || generateId('snap');
    this.vmId = data.vmId;
    this.name = data.name || `snapshot-${Date.now()}`;
    this.description = data.description || '';
    this.createdAt = Date.now();
    this.size = data.size || 0;
    this.state = data.state || 'offline'; // offline, running
  }

  toJSON() {
    return {
      id: this.id,
      vmId: this.vmId,
      name: this.name,
      description: this.description,
      createdAt: this.createdAt,
      size: this.size,
      state: this.state,
    };
  }
}

// Main VM Client
class VMClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.vms = new Map();
    this.networks = new Map();
    this.snapshots = new Map();
    this.storagePath = config.storagePath || path.join(process.env.HOME || '/home/deck', '.gently', 'vms');
    this.qemuPath = config.qemuPath || 'qemu-system-x86_64';
    this.virshPath = config.virshPath || 'virsh';
    this.availableBackends = [];

    // Ensure storage directory
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }

    // Detect backends
    this._detectBackends();

    // Initialize default test network
    this._initDefaultNetwork();
  }

  async _detectBackends() {
    const checks = [
      { cmd: 'which qemu-system-x86_64', backend: VM_BACKEND.QEMU },
      { cmd: 'which virsh', backend: VM_BACKEND.LIBVIRT },
      { cmd: 'which VBoxManage', backend: VM_BACKEND.VIRTUALBOX },
      { cmd: 'which docker', backend: VM_BACKEND.DOCKER },
      { cmd: 'which podman', backend: VM_BACKEND.PODMAN },
    ];

    for (const check of checks) {
      try {
        await this._execAsync(check.cmd);
        this.availableBackends.push(check.backend);
      } catch (e) {
        // Backend not available
      }
    }
  }

  _initDefaultNetwork() {
    const defaultNet = new TestNetwork({
      id: 'default',
      name: 'gently-test',
      cidr: '192.168.100.0/24',
      gateway: '192.168.100.1',
      dhcpStart: '192.168.100.10',
      dhcpEnd: '192.168.100.250',
    });
    this.networks.set('default', defaultNet);
  }

  // Create VM
  createVM(data) {
    const vm = new VirtualMachine(data);
    this.vms.set(vm.id, vm);
    this.emit('vm-created', { vm: vm.toJSON() });
    return { success: true, vm: vm.toJSON() };
  }

  // Create disk image
  async createDisk(name, sizeGB = 20, format = 'qcow2') {
    const diskPath = path.join(this.storagePath, `${name}.${format}`);

    return new Promise((resolve, reject) => {
      exec(`qemu-img create -f ${format} "${diskPath}" ${sizeGB}G`, (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: stderr || error.message });
        }
        resolve({ success: true, path: diskPath, size: `${sizeGB}G`, format });
      });
    });
  }

  // Resize disk
  async resizeDisk(diskPath, newSizeGB) {
    return new Promise((resolve, reject) => {
      exec(`qemu-img resize "${diskPath}" ${newSizeGB}G`, (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: stderr || error.message });
        }
        resolve({ success: true, path: diskPath, newSize: `${newSizeGB}G` });
      });
    });
  }

  // Get disk info
  async getDiskInfo(diskPath) {
    return new Promise((resolve, reject) => {
      exec(`qemu-img info "${diskPath}" --output=json`, (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: stderr || error.message });
        }
        try {
          const info = JSON.parse(stdout);
          resolve({ success: true, info });
        } catch (e) {
          resolve({ success: false, error: 'Failed to parse disk info' });
        }
      });
    });
  }

  // Build QEMU command line
  _buildQemuCommand(vm) {
    const args = [this.qemuPath];

    // Basic options
    if (vm.enableKVM) args.push('-enable-kvm');
    args.push('-machine', vm.machineType);
    args.push('-cpu', vm.cpuModel);
    args.push('-smp', vm.cpuCores.toString());
    args.push('-m', vm.ramMB.toString());

    // UEFI
    if (vm.enableUEFI) {
      args.push('-bios', '/usr/share/ovmf/OVMF.fd');
    }

    // Disks
    vm.disks.forEach((disk, i) => {
      args.push('-drive', `file=${disk.path},format=${disk.format},if=${disk.bus},index=${i}`);
    });

    // CDROM
    if (vm.cdrom) {
      args.push('-cdrom', vm.cdrom);
    }

    // Network
    const netdevId = 'net0';
    switch (vm.networkMode) {
      case NETWORK_MODE.NAT:
        let userNet = `user,id=${netdevId}`;
        vm.portForwards.forEach(pf => {
          userNet += `,hostfwd=${pf.protocol}::${pf.hostPort}-:${pf.guestPort}`;
        });
        args.push('-netdev', userNet);
        break;
      case NETWORK_MODE.BRIDGE:
        args.push('-netdev', `bridge,id=${netdevId},br=${vm.networkBridge}`);
        break;
      case NETWORK_MODE.ISOLATED:
        args.push('-netdev', `socket,id=${netdevId},mcast=230.0.0.1:1234`);
        break;
      case NETWORK_MODE.NONE:
        // No network
        break;
    }

    if (vm.networkMode !== NETWORK_MODE.NONE) {
      args.push('-device', `virtio-net-pci,netdev=${netdevId},mac=${vm.macAddress}`);
    }

    // Display
    switch (vm.display) {
      case 'spice':
        vm.spicePort = vm.spicePort || this._findFreePort(5900);
        args.push('-spice', `port=${vm.spicePort},disable-ticketing=on`);
        args.push('-device', 'virtio-vga');
        break;
      case 'vnc':
        vm.vncPort = vm.vncPort || this._findFreePort(5900);
        const vncDisplay = vm.vncPort - 5900;
        args.push('-vnc', `:${vncDisplay}`);
        args.push('-device', 'virtio-vga');
        break;
      case 'gtk':
        args.push('-display', 'gtk');
        break;
      case 'none':
        args.push('-nographic');
        break;
    }

    // QMP socket for control
    const qmpSocket = path.join(this.storagePath, `${vm.id}.qmp`);
    args.push('-qmp', `unix:${qmpSocket},server,nowait`);

    // Monitor
    const monitorSocket = path.join(this.storagePath, `${vm.id}.monitor`);
    args.push('-monitor', `unix:${monitorSocket},server,nowait`);

    // Extra args
    args.push(...vm.extraArgs);

    // Daemonize
    args.push('-daemonize');

    // Pidfile
    const pidFile = path.join(this.storagePath, `${vm.id}.pid`);
    args.push('-pidfile', pidFile);

    return { args, pidFile, qmpSocket, monitorSocket };
  }

  _findFreePort(startPort) {
    // Simple port finder - in production would check availability
    return startPort + Math.floor(Math.random() * 100);
  }

  // Start VM (QEMU)
  async startVM(vmId) {
    const vm = this.vms.get(vmId);
    if (!vm) return { success: false, error: 'VM not found' };

    if (vm.state === VM_STATE.RUNNING) {
      return { success: false, error: 'VM already running' };
    }

    try {
      vm.state = VM_STATE.STARTING;

      if (vm.backend === VM_BACKEND.QEMU) {
        const { args, pidFile, qmpSocket, monitorSocket } = this._buildQemuCommand(vm);

        await this._execAsync(args.join(' '));

        // Read PID
        await new Promise(r => setTimeout(r, 500));
        if (fs.existsSync(pidFile)) {
          vm.pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim());
        }

        vm.state = VM_STATE.RUNNING;
        vm.startTime = Date.now();

        this.emit('vm-started', { vm: vm.toJSON() });
        return {
          success: true,
          vm: vm.toJSON(),
          spicePort: vm.spicePort,
          vncPort: vm.vncPort,
        };
      } else if (vm.backend === VM_BACKEND.LIBVIRT) {
        await this._execAsync(`virsh start ${vm.name}`);
        vm.state = VM_STATE.RUNNING;
        vm.startTime = Date.now();
        return { success: true, vm: vm.toJSON() };
      }

      return { success: false, error: 'Unsupported backend' };
    } catch (e) {
      vm.state = VM_STATE.ERROR;
      return { success: false, error: e.message };
    }
  }

  // Stop VM
  async stopVM(vmId, force = false) {
    const vm = this.vms.get(vmId);
    if (!vm) return { success: false, error: 'VM not found' };

    try {
      vm.state = VM_STATE.SHUTTING_DOWN;

      if (vm.backend === VM_BACKEND.QEMU && vm.pid) {
        const signal = force ? 'SIGKILL' : 'SIGTERM';
        process.kill(vm.pid, signal);
      } else if (vm.backend === VM_BACKEND.LIBVIRT) {
        const cmd = force ? `virsh destroy ${vm.name}` : `virsh shutdown ${vm.name}`;
        await this._execAsync(cmd);
      }

      vm.state = VM_STATE.STOPPED;
      vm.pid = null;
      vm.startTime = null;

      this.emit('vm-stopped', { vm: vmId });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Pause VM
  async pauseVM(vmId) {
    const vm = this.vms.get(vmId);
    if (!vm) return { success: false, error: 'VM not found' };

    try {
      if (vm.backend === VM_BACKEND.QEMU) {
        // Send pause command via QMP
        await this._sendQMPCommand(vm.id, { execute: 'stop' });
      } else if (vm.backend === VM_BACKEND.LIBVIRT) {
        await this._execAsync(`virsh suspend ${vm.name}`);
      }

      vm.state = VM_STATE.PAUSED;
      this.emit('vm-paused', { vm: vmId });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Resume VM
  async resumeVM(vmId) {
    const vm = this.vms.get(vmId);
    if (!vm) return { success: false, error: 'VM not found' };

    try {
      if (vm.backend === VM_BACKEND.QEMU) {
        await this._sendQMPCommand(vm.id, { execute: 'cont' });
      } else if (vm.backend === VM_BACKEND.LIBVIRT) {
        await this._execAsync(`virsh resume ${vm.name}`);
      }

      vm.state = VM_STATE.RUNNING;
      this.emit('vm-resumed', { vm: vmId });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Send QMP command
  async _sendQMPCommand(vmId, command) {
    const socket = path.join(this.storagePath, `${vmId}.qmp`);
    return new Promise((resolve, reject) => {
      const client = net.createConnection(socket, () => {
        client.write(JSON.stringify(command) + '\n');
      });

      let data = '';
      client.on('data', (chunk) => {
        data += chunk;
        try {
          const result = JSON.parse(data);
          client.end();
          resolve(result);
        } catch (e) {
          // Not complete JSON yet
        }
      });

      client.on('error', reject);
    });
  }

  // List VMs
  listVMs(filter = {}) {
    let vms = Array.from(this.vms.values());

    if (filter.state) {
      vms = vms.filter(vm => vm.state === filter.state);
    }
    if (filter.backend) {
      vms = vms.filter(vm => vm.backend === filter.backend);
    }

    return {
      success: true,
      vms: vms.map(vm => vm.toJSON()),
      total: vms.length,
    };
  }

  // Get VM status
  getVMStatus(vmId) {
    const vm = this.vms.get(vmId);
    if (!vm) return { success: false, error: 'VM not found' };
    return { success: true, vm: vm.toJSON() };
  }

  // Delete VM
  async deleteVM(vmId, deleteDisks = false) {
    const vm = this.vms.get(vmId);
    if (!vm) return { success: false, error: 'VM not found' };

    if (vm.state === VM_STATE.RUNNING) {
      await this.stopVM(vmId, true);
    }

    if (deleteDisks) {
      for (const disk of vm.disks) {
        if (fs.existsSync(disk.path)) {
          fs.unlinkSync(disk.path);
        }
      }
    }

    // Clean up sockets
    const files = [`${vmId}.qmp`, `${vmId}.monitor`, `${vmId}.pid`];
    for (const file of files) {
      const filePath = path.join(this.storagePath, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    this.vms.delete(vmId);
    this.emit('vm-deleted', { vm: vmId });
    return { success: true };
  }

  // Create snapshot
  async createSnapshot(vmId, name, description = '') {
    const vm = this.vms.get(vmId);
    if (!vm) return { success: false, error: 'VM not found' };

    try {
      const snapshot = new VMSnapshot({
        vmId,
        name,
        description,
        state: vm.state === VM_STATE.RUNNING ? 'running' : 'offline',
      });

      if (vm.backend === VM_BACKEND.QEMU && vm.disks.length > 0) {
        // Create QCOW2 snapshot
        const disk = vm.disks[0];
        await this._execAsync(`qemu-img snapshot -c "${name}" "${disk.path}"`);
      } else if (vm.backend === VM_BACKEND.LIBVIRT) {
        await this._execAsync(`virsh snapshot-create-as ${vm.name} ${name} --description "${description}"`);
      }

      this.snapshots.set(snapshot.id, snapshot);
      this.emit('snapshot-created', { snapshot: snapshot.toJSON() });
      return { success: true, snapshot: snapshot.toJSON() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // List snapshots
  listSnapshots(vmId = null) {
    let snapshots = Array.from(this.snapshots.values());
    if (vmId) {
      snapshots = snapshots.filter(s => s.vmId === vmId);
    }
    return {
      success: true,
      snapshots: snapshots.map(s => s.toJSON()),
    };
  }

  // Restore snapshot
  async restoreSnapshot(snapshotId) {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return { success: false, error: 'Snapshot not found' };

    const vm = this.vms.get(snapshot.vmId);
    if (!vm) return { success: false, error: 'VM not found' };

    try {
      if (vm.state === VM_STATE.RUNNING) {
        await this.stopVM(vm.id);
      }

      if (vm.backend === VM_BACKEND.QEMU && vm.disks.length > 0) {
        const disk = vm.disks[0];
        await this._execAsync(`qemu-img snapshot -a "${snapshot.name}" "${disk.path}"`);
      } else if (vm.backend === VM_BACKEND.LIBVIRT) {
        await this._execAsync(`virsh snapshot-revert ${vm.name} ${snapshot.name}`);
      }

      this.emit('snapshot-restored', { snapshot: snapshotId, vm: vm.id });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Delete snapshot
  async deleteSnapshot(snapshotId) {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return { success: false, error: 'Snapshot not found' };

    const vm = this.vms.get(snapshot.vmId);
    if (!vm) return { success: false, error: 'VM not found' };

    try {
      if (vm.backend === VM_BACKEND.QEMU && vm.disks.length > 0) {
        const disk = vm.disks[0];
        await this._execAsync(`qemu-img snapshot -d "${snapshot.name}" "${disk.path}"`);
      } else if (vm.backend === VM_BACKEND.LIBVIRT) {
        await this._execAsync(`virsh snapshot-delete ${vm.name} ${snapshot.name}`);
      }

      this.snapshots.delete(snapshotId);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Create test network
  async createNetwork(data) {
    const network = new TestNetwork(data);

    try {
      // Create bridge
      await this._execAsync(`ip link add ${network.bridge} type bridge 2>/dev/null || true`);
      await this._execAsync(`ip addr add ${network.gateway}/24 dev ${network.bridge} 2>/dev/null || true`);
      await this._execAsync(`ip link set ${network.bridge} up`);

      // Enable NAT (if not isolated)
      if (!network.isolated) {
        await this._execAsync(`iptables -t nat -A POSTROUTING -s ${network.cidr} ! -d ${network.cidr} -j MASQUERADE 2>/dev/null || true`);
      }

      network.active = true;
      this.networks.set(network.id, network);

      this.emit('network-created', { network: network.toJSON() });
      return { success: true, network: network.toJSON() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // List networks
  listNetworks() {
    return {
      success: true,
      networks: Array.from(this.networks.values()).map(n => n.toJSON()),
    };
  }

  // Delete network
  async deleteNetwork(networkId) {
    const network = this.networks.get(networkId);
    if (!network) return { success: false, error: 'Network not found' };

    if (network.vms.size > 0) {
      return { success: false, error: 'Network has connected VMs' };
    }

    try {
      await this._execAsync(`ip link set ${network.bridge} down 2>/dev/null || true`);
      await this._execAsync(`ip link delete ${network.bridge} 2>/dev/null || true`);

      this.networks.delete(networkId);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Connect VM to network
  connectToNetwork(vmId, networkId) {
    const vm = this.vms.get(vmId);
    const network = this.networks.get(networkId);

    if (!vm) return { success: false, error: 'VM not found' };
    if (!network) return { success: false, error: 'Network not found' };

    vm.networkMode = NETWORK_MODE.BRIDGE;
    vm.networkBridge = network.bridge;
    network.vms.add(vmId);

    return { success: true };
  }

  // Get available backends
  getBackends() {
    return {
      success: true,
      backends: this.availableBackends,
    };
  }

  // Execute async command
  _execAsync(cmd) {
    return new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) reject(new Error(stderr || error.message));
        else resolve(stdout);
      });
    });
  }

  // Quick VM creation presets
  createQuickVM(preset) {
    const presets = {
      'ubuntu-server': {
        name: 'Ubuntu Server',
        osType: OS_TYPE.LINUX,
        osVariant: 'ubuntu22.04',
        cpuCores: 2,
        ramMB: 2048,
      },
      'debian': {
        name: 'Debian',
        osType: OS_TYPE.LINUX,
        osVariant: 'debian11',
        cpuCores: 2,
        ramMB: 2048,
      },
      'alpine': {
        name: 'Alpine Linux',
        osType: OS_TYPE.LINUX,
        osVariant: 'alpinelinux3.17',
        cpuCores: 1,
        ramMB: 512,
      },
      'windows': {
        name: 'Windows',
        osType: OS_TYPE.WINDOWS,
        osVariant: 'win11',
        cpuCores: 4,
        ramMB: 8192,
        enableUEFI: true,
      },
      'kali': {
        name: 'Kali Linux',
        osType: OS_TYPE.LINUX,
        osVariant: 'kali',
        cpuCores: 2,
        ramMB: 4096,
      },
      'router': {
        name: 'Test Router',
        osType: OS_TYPE.LINUX,
        osVariant: 'openwrt',
        cpuCores: 1,
        ramMB: 256,
        networkMode: NETWORK_MODE.BRIDGE,
      },
    };

    const config = presets[preset];
    if (!config) {
      return { success: false, error: 'Unknown preset', available: Object.keys(presets) };
    }

    return this.createVM(config);
  }

  // Get constants
  getConstants() {
    return {
      success: true,
      VM_BACKEND,
      VM_STATE,
      OS_TYPE,
      NETWORK_MODE,
    };
  }
}

module.exports = {
  VMClient,
  VirtualMachine,
  TestNetwork,
  VMSnapshot,
  VM_BACKEND,
  VM_STATE,
  OS_TYPE,
  NETWORK_MODE,
};
