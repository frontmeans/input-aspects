import { newNamespaceAliaser } from '@frontmeans/namespace-aliaser';
import { InNamespaceAliaser } from '../aspects';
import { InSelect, inSelect } from './select.control';

describe('InSelect', () => {

  let select: HTMLSelectElement;
  let control: InSelect;

  beforeEach(() => {
    select = document.createElement('select');
    select.multiple = true;

    const option1 = document.createElement('option');
    const option2 = document.createElement('option');
    const option3 = document.createElement('option');

    option1.value = '1';
    option2.value = '2';
    option3.value = '3';

    select.add(option1);
    select.add(option2);
    select.add(option3);

    control = inSelect(select);
  });

  it('accepts default aspects', () => {

    const nsAlias = newNamespaceAliaser();
    const control = inSelect(select, { aspects: InNamespaceAliaser.to(nsAlias) });

    expect(control.aspect(InNamespaceAliaser)).toBe(nsAlias);
  });

  describe('it', () => {
    it('reflect missing selection', () => {
      expect(control.it).toEqual([]);
    });
    it('reflects single selection', () => {
      select.options[1].selected = true;
      select.dispatchEvent(new KeyboardEvent('change'));
      expect(control.it).toEqual(['2']);
    });
    it('reflects multi-selection', () => {
      select.options[0].selected = true;
      select.options[2].selected = true;
      select.dispatchEvent(new KeyboardEvent('change'));
      expect(control.it).toEqual(['1', '3']);
    });
    it('updates single selection', () => {
      control.it = ['2'];
      expect(select.options[0].selected).toBe(false);
      expect(select.options[1].selected).toBe(true);
      expect(select.options[2].selected).toBe(false);
    });
    it('updates multi-selection', () => {
      control.it = ['1', '2'];
      control.it = ['3', '1'];
      expect(select.options[0].selected).toBe(true);
      expect(select.options[1].selected).toBe(false);
      expect(select.options[2].selected).toBe(true);
    });
    it('corrects invalid selection', () => {
      control.it = ['2', 'wrong'];
      expect(control.it).toEqual(['2']);
    });
    it('selects the first element of single-selection', () => {
      select.multiple = false;
      control.it = ['2', '1'];
      expect(control.it).toEqual(['1']);
    });
  });
});
