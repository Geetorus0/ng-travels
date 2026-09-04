package in.ngtravels.operations;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        injectRole();
    }

    private void injectRole() {
        if (bridge != null && bridge.getWebView() != null) {
            try {
                final String role = getString(R.string.app_role);
                bridge.getWebView().post(new Runnable() {
                    @Override
                    public void run() {
                        bridge.getWebView().evaluateJavascript("window.NG_APP_ROLE = '" + role + "';", null);
                    }
                });
            } catch (Exception ignored) {}
        }
    }
}
