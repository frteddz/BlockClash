package com.blockclash.game.lan;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * LAN transport only. All game rules stay in the shared TypeScript core, which
 * the host app runs. This class just hosts a socket and advertises it locally.
 */
@CapacitorPlugin(name = "BlockClashLan")
public class BlockClashLanPlugin extends Plugin {
    private static final String SERVICE_TYPE = "_blockclash._tcp";

    private WebSocketServer server;
    private NsdManager nsdManager;
    private NsdManager.RegistrationListener registrationListener;
    private NsdManager.DiscoveryListener discoveryListener;
    private final Map<WebSocket, String> clients = new LinkedHashMap<>();
    private int nextClientId = 1;

    @PluginMethod
    public void startHost(PluginCall call) {
        String code = call.getString("code");
        if (code == null || code.length() != 6) {
            call.reject("A 6 digit code is required");
            return;
        }
        stopAll();

        final int port = freePort();
        if (port < 0) {
            call.reject("Could not find a free port");
            return;
        }

        server = new WebSocketServer(new InetSocketAddress(port)) {
            @Override
            public void onOpen(WebSocket connection, ClientHandshake handshake) {
                String id = "c" + nextClientId++;
                clients.put(connection, id);
                JSObject event = new JSObject();
                event.put("clientId", id);
                notifyListeners("connection", event, true);
            }

            @Override
            public void onClose(WebSocket connection, int code, String reason, boolean remote) {
                String id = clients.remove(connection);
                JSObject event = new JSObject();
                event.put("clientId", id);
                notifyListeners("disconnect", event, true);
            }

            @Override
            public void onMessage(WebSocket connection, String message) {
                JSObject event = new JSObject();
                event.put("clientId", clients.get(connection));
                event.put("text", message);
                notifyListeners("message", event, true);
            }

            @Override
            public void onError(WebSocket connection, Exception ex) {
                JSObject event = new JSObject();
                event.put("message", ex == null ? "socket error" : ex.getMessage());
                notifyListeners("error", event, true);
            }

            @Override
            public void onStart() {}
        };
        server.setReuseAddr(true);
        server.start();

        registerService(code, port);
        JSObject result = new JSObject();
        result.put("port", port);
        result.put("code", code);
        call.resolve(result);
    }

    @PluginMethod
    public void send(PluginCall call) {
        String clientId = call.getString("clientId");
        String text = call.getString("text");
        if (clientId == null || text == null || server == null) {
            call.reject("No connection to send on");
            return;
        }
        for (Map.Entry<WebSocket, String> entry : clients.entrySet()) {
            if (clientId.equals(entry.getValue())) {
                entry.getKey().send(text);
                call.resolve();
                return;
            }
        }
        call.reject("Unknown client");
    }

    @PluginMethod
    public void scan(PluginCall call) {
        if (nsdManager == null) nsdManager = (NsdManager) getContext().getSystemService(Context.NSD_SERVICE);
        stopDiscovery();

        final List<JSObject> found = new ArrayList<>();
        discoveryListener = new NsdManager.DiscoveryListener() {
            @Override
            public void onDiscoveryStarted(String serviceType) {}

            @Override
            public void onServiceFound(NsdServiceInfo service) {
                if (!SERVICE_TYPE.equals(service.getServiceType())) return;
                nsdManager.resolveService(service, new NsdManager.ResolveListener() {
                    @Override
                    public void onServiceResolved(NsdServiceInfo resolved) {
                        JSObject device = new JSObject();
                        String name = resolved.getServiceName();
                        device.put("name", name == null ? "BlockClash" : name);
                        device.put("host", resolved.getHost().getHostAddress());
                        device.put("port", resolved.getPort());
                        Map<String, byte[]> txt = resolved.getAttributes();
                        byte[] code = txt == null ? null : txt.get("code");
                        device.put("code", code == null ? "" : new String(code));
                        found.add(device);
                        JSArray array = new JSArray();
                        for (JSObject item : found) array.put(item);
                        JSObject event = new JSObject();
                        event.put("devices", array);
                        notifyListeners("devices", event, true);
                    }

                    @Override
                    public void onResolveFailed(NsdServiceInfo service, int errorCode) {}
                });
            }

            @Override
            public void onServiceLost(NsdServiceInfo service) {}

            @Override
            public void onDiscoveryStopped(String serviceType) {}

            @Override
            public void onStartDiscoveryFailed(String serviceType, int errorCode) {
                JSObject event = new JSObject();
                event.put("message", "Could not start WiFi discovery");
                notifyListeners("error", event, true);
            }

            @Override
            public void onStopDiscoveryFailed(String serviceType, int errorCode) {}
        };
        nsdManager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopAll();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        stopAll();
    }

    private void registerService(String code, int port) {
        if (nsdManager == null) nsdManager = (NsdManager) getContext().getSystemService(Context.NSD_SERVICE);
        NsdServiceInfo service = new NsdServiceInfo();
        service.setServiceType(SERVICE_TYPE);
        service.setServiceName("BlockClash-" + code);
        service.setPort(port);
        service.setAttribute("code", code);
        registrationListener = new NsdManager.RegistrationListener() {
            @Override
            public void onRegistrationFailed(NsdServiceInfo info, int errorCode) {
                JSObject event = new JSObject();
                event.put("message", "Could not advertise this device on WiFi");
                notifyListeners("error", event, true);
            }

            @Override
            public void onUnregistrationFailed(NsdServiceInfo info, int errorCode) {}

            @Override
            public void onServiceRegistered(NsdServiceInfo info) {}

            @Override
            public void onServiceUnregistered(NsdServiceInfo info) {}
        };
        nsdManager.registerService(service, NsdManager.PROTOCOL_DNS_SD, registrationListener);
    }

    private void stopDiscovery() {
        if (discoveryListener != null) {
            try { nsdManager.stopServiceDiscovery(discoveryListener); } catch (Exception ignored) {}
            discoveryListener = null;
        }
    }

    private void stopAll() {
        stopDiscovery();
        if (registrationListener != null) {
            try { nsdManager.unregisterService(registrationListener); } catch (Exception ignored) {}
            registrationListener = null;
        }
        if (server != null) {
            try { server.stop(); } catch (Exception ignored) {}
            server = null;
        }
        clients.clear();
    }

    private int freePort() {
        for (int port = 8765; port < 8785; port++) {
            try (ServerSocket socket = new ServerSocket(port)) {
                return socket.getLocalPort();
            } catch (Exception ignored) {}
        }
        return -1;
    }
}
