package com.blockclash.game;

import android.os.Bundle;

import com.blockclash.game.lan.BlockClashLanPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BlockClashLanPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
