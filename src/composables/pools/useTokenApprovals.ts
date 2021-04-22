import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { approveTokens } from '@/utils/balancer/tokens';
import { parseUnits } from '@ethersproject/units';
import useAuth from '@/composables/useAuth';
import useTokens from '@/composables/useTokens';
import useNotify from '@/composables/useNotify';

export default function useTokenApprovals(tokens, shortAmounts) {
  const auth = useAuth();
  const store = useStore();
  const approving = ref(false);
  const approvedAll = ref(false);
  const { allTokens } = useTokens();
  const { txListener } = useNotify();

  const amounts = computed(() =>
    tokens.map((token, index) => {
      const shortAmount = shortAmounts.value[index] || '0';
      const decimals = allTokens.value[token].decimals;
      const amount = parseUnits(shortAmount, decimals).toString();
      return amount;
    })
  );

  const requiredAllowances = computed(() => {
    const allowances = store.getters['account/getRequiredAllowances']({
      tokens,
      amounts: amounts.value
    });
    return allowances;
  });

  function handleTransactions(txs) {
    txs.forEach(tx => {
      txListener(tx.hash, {
        onTxConfirmed: () => {
          store.dispatch('account/getAllowances', { tokens });
          approving.value = false;
        },
        onTxCancel: () => {
          approving.value = false;
        },
        onTxFailed: () => {
          approving.value = false;
        }
      });
    });
  }

  async function approveAllowances(): Promise<void> {
    try {
      approving.value = true;
      const txs = await approveTokens(
        auth.web3,
        store.state.web3.config.addresses.vault,
        requiredAllowances.value
      );
      console.log(txs);
      handleTransactions(txs);
    } catch (error) {
      console.error(error);
    }
  }

  return { requiredAllowances, approveAllowances, approving, approvedAll };
}